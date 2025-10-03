#include <napi.h>
#include <memory>
#include <string>
#include <thread>
#include <chrono>
#include <mutex>

// Include EDK headers for real UDP streaming
#include "huestream/HueStream.h"
#include "huestream/config/Config.h"
#include "huestream/common/data/Bridge.h"
#include "huestream/common/data/BridgeSettings.h"
#include "huestream/common/data/Group.h"
#include "huestream/common/data/Light.h"
#include "huestream/common/data/Color.h"
#include "huestream/effect/effects/ManualEffect.h"

using namespace huestream;

// Real HueStream wrapper with actual EDK calls
class HueWrapper : public Napi::ObjectWrap<HueWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    HueWrapper(const Napi::CallbackInfo& info);
    ~HueWrapper();

private:
    static Napi::FunctionReference constructor;
    
    // Native methods that call EDK
    Napi::Value Initialize(const Napi::CallbackInfo& info);
    Napi::Value ConnectManual(const Napi::CallbackInfo& info);
    Napi::Value SelectGroup(const Napi::CallbackInfo& info);
    Napi::Value Start(const Napi::CallbackInfo& info);
    Napi::Value Stop(const Napi::CallbackInfo& info);

    // RGB color methods
    Napi::Value SetColorRGB(const Napi::CallbackInfo& info);
    Napi::Value SetColorRGBA(const Napi::CallbackInfo& info);
    Napi::Value SetLightColorRGB(const Napi::CallbackInfo& info);
    Napi::Value SetLightColorRGBA(const Napi::CallbackInfo& info);

    // XY color space methods
    Napi::Value SetColorXY(const Napi::CallbackInfo& info);
    Napi::Value SetLightColorXY(const Napi::CallbackInfo& info);

    // Color temperature methods
    Napi::Value SetColorCT(const Napi::CallbackInfo& info);
    Napi::Value SetLightColorCT(const Napi::CallbackInfo& info);

    // Brightness control
    Napi::Value SetBrightness(const Napi::CallbackInfo& info);
    Napi::Value SetLightBrightness(const Napi::CallbackInfo& info);

    Napi::Value GetLightIds(const Napi::CallbackInfo& info);
    Napi::Value Update(const Napi::CallbackInfo& info);
    Napi::Value GetStatus(const Napi::CallbackInfo& info);
    Napi::Value Shutdown(const Napi::CallbackInfo& info);

    // EDK objects
    std::string appName_;
    std::string deviceName_;
    std::shared_ptr<Config> config_;
    std::unique_ptr<HueStream> hueStream_;
    std::shared_ptr<ManualEffect> manualEffect_;
    
    // State tracking
    std::mutex mutex_;
    bool initialized_;
    bool connected_;
    bool streaming_;
    std::string selectedGroupId_;
};

Napi::FunctionReference HueWrapper::constructor;

Napi::Object HueWrapper::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "HueWrapper", {
        InstanceMethod("initialize", &HueWrapper::Initialize),
        InstanceMethod("connectManual", &HueWrapper::ConnectManual),
        InstanceMethod("selectGroup", &HueWrapper::SelectGroup),
        InstanceMethod("start", &HueWrapper::Start),
        InstanceMethod("stop", &HueWrapper::Stop),
        // RGB methods
        InstanceMethod("setColorRGB", &HueWrapper::SetColorRGB),
        InstanceMethod("setColorRGBA", &HueWrapper::SetColorRGBA),
        InstanceMethod("setLightColorRGB", &HueWrapper::SetLightColorRGB),
        InstanceMethod("setLightColorRGBA", &HueWrapper::SetLightColorRGBA),
        // XY color space methods
        InstanceMethod("setColorXY", &HueWrapper::SetColorXY),
        InstanceMethod("setLightColorXY", &HueWrapper::SetLightColorXY),
        // Color temperature methods
        InstanceMethod("setColorCT", &HueWrapper::SetColorCT),
        InstanceMethod("setLightColorCT", &HueWrapper::SetLightColorCT),
        // Brightness control
        InstanceMethod("setBrightness", &HueWrapper::SetBrightness),
        InstanceMethod("setLightBrightness", &HueWrapper::SetLightBrightness),
        InstanceMethod("getLightIds", &HueWrapper::GetLightIds),
        InstanceMethod("update", &HueWrapper::Update),
        InstanceMethod("getStatus", &HueWrapper::GetStatus),
        InstanceMethod("shutdown", &HueWrapper::Shutdown)
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();
    exports.Set("HueWrapper", func);
    return exports;
}

HueWrapper::HueWrapper(const Napi::CallbackInfo& info) 
    : Napi::ObjectWrap<HueWrapper>(info), 
      initialized_(false),
      connected_(false),
      streaming_(false),
      selectedGroupId_("0") {
    
    Napi::Env env = info.Env();
    
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Expected appName and deviceName")
            .ThrowAsJavaScriptException();
        return;
    }

    appName_ = info[0].As<Napi::String>().Utf8Value();
    deviceName_ = info[1].As<Napi::String>().Utf8Value();
}

HueWrapper::~HueWrapper() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (streaming_ && hueStream_) {
        hueStream_->Stop();
        hueStream_->ShutDown();
    }
}

Napi::Value HueWrapper::Initialize(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (initialized_) {
        Napi::Object result = Napi::Object::New(env);
        result.Set("success", Napi::Boolean::New(env, true));
        result.Set("message", Napi::String::New(env, "Already initialized"));
        return result;
    }
    
    try {
        // Create HueStream config for UDP streaming
        PersistenceEncryptionKey encKey("default_key");
        config_ = std::make_shared<Config>(appName_, deviceName_, encKey);
        
        // Use DTLS for secure streaming with valid entertainment credentials
        config_->SetStreamingMode(STREAMING_MODE_DTLS);
        
        // Enable render thread for automatic UDP packet sending at 60Hz
        config_->GetAppSettings()->SetUseRenderThread(true);
        // Let EDK auto-start streaming after group selection (default behavior)
        // config_->GetAppSettings()->SetAutoStartAtConnection(false); // REMOVED - use default
        config_->GetStreamSettings()->SetUpdateFrequency(60);
        
        // Create HueStream instance with EDK
        hueStream_ = std::make_unique<HueStream>(config_);
        
        // Don't create ManualEffect here - wait until streaming is ready
        
        initialized_ = true;
        
        Napi::Object result = Napi::Object::New(env);
        result.Set("success", Napi::Boolean::New(env, true));
        result.Set("streamingMode", Napi::String::New(env, "DTLS"));
        result.Set("message", Napi::String::New(env, "EDK HueStream initialized"));
        return result;
        
    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("EDK initialization failed: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value HueWrapper::ConnectManual(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!initialized_ || !hueStream_) {
        Napi::Error::New(env, "Not initialized").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(env, "Expected bridge config object")
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    Napi::Object config = info[0].As<Napi::Object>();
    
    try {
        std::lock_guard<std::mutex> lock(mutex_);
        
        // Extract bridge info
        std::string bridgeId = config.Get("id").As<Napi::String>().Utf8Value();
        std::string ipAddress = config.Get("ip").As<Napi::String>().Utf8Value();
        std::string username = config.Get("username").As<Napi::String>().Utf8Value();
        std::string clientKey = config.Get("clientKey").As<Napi::String>().Utf8Value();
        
        // Create bridge with EDK
        auto bridgeSettings = std::make_shared<BridgeSettings>();
        auto bridge = std::make_shared<Bridge>(bridgeId, ipAddress, true, bridgeSettings);
        
        // Set credentials for UDP/DTLS streaming
        bridge->SetUser(username);
        bridge->SetClientKey(clientKey);
        
        // Connect via EDK (blocking call - waits until ready)
        hueStream_->ConnectManualBridgeInfo(bridge);
        
        // Check connection result
        auto result = hueStream_->GetConnectionResult();
        connected_ = (result == ConnectResult::ReadyToStart || result == ConnectResult::Streaming);
        
        return Napi::Boolean::New(env, connected_);
        
    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Bridge connection failed: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value HueWrapper::SelectGroup(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!initialized_ || !hueStream_) {
        Napi::Error::New(env, "Not initialized").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    try {
        std::lock_guard<std::mutex> lock(mutex_);
        
        // Get group ID (default to entertainment group)
        std::string groupId = "200"; // Your entertainment group
        if (info.Length() > 0 && info[0].IsString()) {
            groupId = info[0].As<Napi::String>().Utf8Value();
        }
        
        selectedGroupId_ = groupId;
        
        // Select group via EDK (blocking call - waits until ready)
        hueStream_->SelectGroup(groupId);
        
        return Napi::Boolean::New(env, true);
        
    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Group selection failed: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value HueWrapper::Start(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!initialized_ || !hueStream_ || !connected_) {
        Napi::Error::New(env, "Not connected to bridge").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    try {
        std::lock_guard<std::mutex> lock(mutex_);
        
        // With auto-start enabled, streaming should already be active after group selection
        // Check if bridge is streaming
        streaming_ = hueStream_->IsBridgeStreaming();
        
        if (!streaming_) {
            // If not streaming, it means group selection hasn't triggered auto-start yet
            // This shouldn't happen with proper group selection, but handle it
            return Napi::Boolean::New(env, false);
        }
        
        // Create ManualEffect if not already created
        if (!manualEffect_) {
            manualEffect_ = std::make_shared<ManualEffect>("manual_effect", 1);
            
            // Add effect to mixer
            hueStream_->LockMixer();
            hueStream_->AddEffect(manualEffect_);
            manualEffect_->Enable();
            hueStream_->UnlockMixer();
        } else {
            // Effect already exists, just enable it
            hueStream_->LockMixer();
            manualEffect_->Enable();
            hueStream_->UnlockMixer();
        }
        
        return Napi::Boolean::New(env, true);
        
    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Streaming start failed: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value HueWrapper::GetLightIds(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!hueStream_ || !hueStream_->GetActiveBridge()) {
        Napi::Error::New(env, "Not connected to bridge").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    
    try {
        Napi::Array lightIds = Napi::Array::New(env);
        
        auto bridge = hueStream_->GetActiveBridge();
        if (bridge && bridge->GetGroup()) {
            auto lights = bridge->GetGroup()->GetLights();
            if (lights) {
                uint32_t index = 0;
                for (auto& light : *lights) {
                    lightIds.Set(index++, Napi::String::New(env, light->GetId()));
                }
            }
        }
        
        return lightIds;
        
    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("GetLightIds failed: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value HueWrapper::Update(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // With render thread enabled, updates happen automatically
    // This method is kept for compatibility but isn't needed
    
    return Napi::Boolean::New(env, true);
}

Napi::Value HueWrapper::Stop(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    try {
        std::lock_guard<std::mutex> lock(mutex_);

        // Disable the effect but keep it in the mixer
        if (manualEffect_) {
            hueStream_->LockMixer();
            manualEffect_->Disable();
            hueStream_->UnlockMixer();
        }

        // With auto-start, we typically don't stop streaming
        // Just disable effects and let streaming continue
        // Only stop if explicitly needed (e.g., switching groups)

        // Note: We don't call hueStream_->Stop() here with auto-start
        // Streaming continues, effects are just disabled

        return Napi::Boolean::New(env, true);

    } catch (const std::exception&) {
        return Napi::Boolean::New(env, false);
    }
}

// ============= RGB Color Methods =============

Napi::Value HueWrapper::SetColorRGB(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!hueStream_ || !hueStream_->IsBridgeStreaming() || !manualEffect_) {
        Napi::Error::New(env, "Not streaming").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 3) {
        Napi::TypeError::New(env, "Expected r, g, b values").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try {
        double r = info[0].As<Napi::Number>().DoubleValue() / 255.0;
        double g = info[1].As<Napi::Number>().DoubleValue() / 255.0;
        double b = info[2].As<Napi::Number>().DoubleValue() / 255.0;

        // Create color with RGB only (alpha defaults to 1.0)
        Color color(r, g, b);

        auto bridge = hueStream_->GetActiveBridge();
        if (bridge && bridge->GetGroup()) {
            auto lights = bridge->GetGroup()->GetLights();
            if (lights) {
                hueStream_->LockMixer();
                for (auto& light : *lights) {
                    manualEffect_->SetIdToColor(light->GetId(), color);
                }
                manualEffect_->Enable();
                hueStream_->UnlockMixer();
            }
        }

        return Napi::Boolean::New(env, true);

    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("SetColorRGB failed: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value HueWrapper::SetColorRGBA(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!hueStream_ || !hueStream_->IsBridgeStreaming() || !manualEffect_) {
        Napi::Error::New(env, "Not streaming").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 4) {
        Napi::TypeError::New(env, "Expected r, g, b, alpha values").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try {
        double r = info[0].As<Napi::Number>().DoubleValue() / 255.0;
        double g = info[1].As<Napi::Number>().DoubleValue() / 255.0;
        double b = info[2].As<Napi::Number>().DoubleValue() / 255.0;
        double alpha = info[3].As<Napi::Number>().DoubleValue();  // 0-1 range

        // Create color with RGBA
        Color color(r, g, b, alpha);

        auto bridge = hueStream_->GetActiveBridge();
        if (bridge && bridge->GetGroup()) {
            auto lights = bridge->GetGroup()->GetLights();
            if (lights) {
                hueStream_->LockMixer();
                for (auto& light : *lights) {
                    manualEffect_->SetIdToColor(light->GetId(), color);
                }
                manualEffect_->Enable();
                hueStream_->UnlockMixer();
            }
        }

        return Napi::Boolean::New(env, true);

    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("SetColorRGBA failed: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value HueWrapper::SetLightColorRGB(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!hueStream_ || !hueStream_->IsBridgeStreaming() || !manualEffect_) {
        Napi::Error::New(env, "Not streaming").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 4) {
        Napi::TypeError::New(env, "Expected lightId, r, g, b").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try {
        int lightId = info[0].As<Napi::Number>().Int32Value();
        double r = info[1].As<Napi::Number>().DoubleValue() / 255.0;
        double g = info[2].As<Napi::Number>().DoubleValue() / 255.0;
        double b = info[3].As<Napi::Number>().DoubleValue() / 255.0;

        // Create color with RGB only
        Color color(r, g, b);

        hueStream_->LockMixer();
        manualEffect_->SetIdToColor(std::to_string(lightId), color);
        manualEffect_->Enable();
        hueStream_->UnlockMixer();

        return Napi::Boolean::New(env, true);

    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("SetLightColorRGB failed: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value HueWrapper::SetLightColorRGBA(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!hueStream_ || !hueStream_->IsBridgeStreaming() || !manualEffect_) {
        Napi::Error::New(env, "Not streaming").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 5) {
        Napi::TypeError::New(env, "Expected lightId, r, g, b, alpha").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try {
        int lightId = info[0].As<Napi::Number>().Int32Value();
        double r = info[1].As<Napi::Number>().DoubleValue() / 255.0;
        double g = info[2].As<Napi::Number>().DoubleValue() / 255.0;
        double b = info[3].As<Napi::Number>().DoubleValue() / 255.0;
        double alpha = info[4].As<Napi::Number>().DoubleValue();

        // Create color with RGBA
        Color color(r, g, b, alpha);

        hueStream_->LockMixer();
        manualEffect_->SetIdToColor(std::to_string(lightId), color);
        manualEffect_->Enable();
        hueStream_->UnlockMixer();

        return Napi::Boolean::New(env, true);

    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("SetLightColorRGBA failed: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

// ============= XY Color Space Methods =============

Napi::Value HueWrapper::SetColorXY(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!hueStream_ || !hueStream_->IsBridgeStreaming() || !manualEffect_) {
        Napi::Error::New(env, "Not streaming").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 3) {
        Napi::TypeError::New(env, "Expected x, y, brightness values").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try {
        double x = info[0].As<Napi::Number>().DoubleValue();
        double y = info[1].As<Napi::Number>().DoubleValue();
        double brightness = info[2].As<Napi::Number>().DoubleValue();  // 0-1 range

        // Create color from XY coordinates
        double xy[2] = {x, y};
        Color color(xy, brightness);

        auto bridge = hueStream_->GetActiveBridge();
        if (bridge && bridge->GetGroup()) {
            auto lights = bridge->GetGroup()->GetLights();
            if (lights) {
                hueStream_->LockMixer();
                for (auto& light : *lights) {
                    manualEffect_->SetIdToColor(light->GetId(), color);
                }
                manualEffect_->Enable();
                hueStream_->UnlockMixer();
            }
        }

        return Napi::Boolean::New(env, true);

    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("SetColorXY failed: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value HueWrapper::SetLightColorXY(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!hueStream_ || !hueStream_->IsBridgeStreaming() || !manualEffect_) {
        Napi::Error::New(env, "Not streaming").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 4) {
        Napi::TypeError::New(env, "Expected lightId, x, y, brightness").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try {
        int lightId = info[0].As<Napi::Number>().Int32Value();
        double x = info[1].As<Napi::Number>().DoubleValue();
        double y = info[2].As<Napi::Number>().DoubleValue();
        double brightness = info[3].As<Napi::Number>().DoubleValue();

        // Create color from XY coordinates
        double xy[2] = {x, y};
        Color color(xy, brightness);

        hueStream_->LockMixer();
        manualEffect_->SetIdToColor(std::to_string(lightId), color);
        manualEffect_->Enable();
        hueStream_->UnlockMixer();

        return Napi::Boolean::New(env, true);

    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("SetLightColorXY failed: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

// ============= Color Temperature Methods =============

Napi::Value HueWrapper::SetColorCT(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!hueStream_ || !hueStream_->IsBridgeStreaming() || !manualEffect_) {
        Napi::Error::New(env, "Not streaming").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Expected colorTemperature, brightness values").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try {
        int ct = info[0].As<Napi::Number>().Int32Value();  // mireds (153-500)
        double brightness = info[1].As<Napi::Number>().DoubleValue();  // 0-1 range

        // Create color from color temperature
        Color color(ct, brightness, 254);

        auto bridge = hueStream_->GetActiveBridge();
        if (bridge && bridge->GetGroup()) {
            auto lights = bridge->GetGroup()->GetLights();
            if (lights) {
                hueStream_->LockMixer();
                for (auto& light : *lights) {
                    manualEffect_->SetIdToColor(light->GetId(), color);
                }
                manualEffect_->Enable();
                hueStream_->UnlockMixer();
            }
        }

        return Napi::Boolean::New(env, true);

    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("SetColorCT failed: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value HueWrapper::SetLightColorCT(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!hueStream_ || !hueStream_->IsBridgeStreaming() || !manualEffect_) {
        Napi::Error::New(env, "Not streaming").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 3) {
        Napi::TypeError::New(env, "Expected lightId, colorTemperature, brightness").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try {
        int lightId = info[0].As<Napi::Number>().Int32Value();
        int ct = info[1].As<Napi::Number>().Int32Value();  // mireds
        double brightness = info[2].As<Napi::Number>().DoubleValue();

        // Create color from color temperature
        Color color(ct, brightness, 254);

        hueStream_->LockMixer();
        manualEffect_->SetIdToColor(std::to_string(lightId), color);
        manualEffect_->Enable();
        hueStream_->UnlockMixer();

        return Napi::Boolean::New(env, true);

    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("SetLightColorCT failed: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

// ============= Brightness Control Methods =============

Napi::Value HueWrapper::SetBrightness(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!hueStream_ || !hueStream_->IsBridgeStreaming() || !manualEffect_) {
        Napi::Error::New(env, "Not streaming").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Expected brightness value").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try {
        double brightness = info[0].As<Napi::Number>().DoubleValue();  // 0-1 range

        // Apply brightness to all lights by creating a white color with brightness
        Color color(1.0, 1.0, 1.0);
        color.ApplyBrightness(brightness);

        auto bridge = hueStream_->GetActiveBridge();
        if (bridge && bridge->GetGroup()) {
            auto lights = bridge->GetGroup()->GetLights();
            if (lights) {
                hueStream_->LockMixer();
                for (auto& light : *lights) {
                    manualEffect_->SetIdToColor(light->GetId(), color);
                }
                manualEffect_->Enable();
                hueStream_->UnlockMixer();
            }
        }

        return Napi::Boolean::New(env, true);

    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("SetBrightness failed: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value HueWrapper::SetLightBrightness(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!hueStream_ || !hueStream_->IsBridgeStreaming() || !manualEffect_) {
        Napi::Error::New(env, "Not streaming").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Expected lightId, brightness").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try {
        int lightId = info[0].As<Napi::Number>().Int32Value();
        double brightness = info[1].As<Napi::Number>().DoubleValue();

        // Apply brightness to specific light
        Color color(1.0, 1.0, 1.0);
        color.ApplyBrightness(brightness);

        hueStream_->LockMixer();
        manualEffect_->SetIdToColor(std::to_string(lightId), color);
        manualEffect_->Enable();
        hueStream_->UnlockMixer();

        return Napi::Boolean::New(env, true);

    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("SetLightBrightness failed: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value HueWrapper::GetStatus(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    std::lock_guard<std::mutex> lock(mutex_);
    
    Napi::Object status = Napi::Object::New(env);
    status.Set("initialized", Napi::Boolean::New(env, initialized_));
    status.Set("connected", Napi::Boolean::New(env, connected_));
    // Check actual streaming status
    bool isStreaming = hueStream_ ? hueStream_->IsBridgeStreaming() : false;
    status.Set("streaming", Napi::Boolean::New(env, isStreaming));
    status.Set("appName", Napi::String::New(env, appName_));
    status.Set("deviceName", Napi::String::New(env, deviceName_));
    status.Set("streamingMode", Napi::String::New(env, "DTLS"));
    status.Set("selectedGroup", Napi::String::New(env, selectedGroupId_));
    
    if (initialized_ && hueStream_) {
        auto bridge = hueStream_->GetActiveBridge();
        if (bridge) {
            Napi::Object bridgeInfo = Napi::Object::New(env);
            bridgeInfo.Set("id", Napi::String::New(env, bridge->GetId()));
            bridgeInfo.Set("ip", Napi::String::New(env, bridge->GetIpAddress()));
            bridgeInfo.Set("connected", Napi::Boolean::New(env, bridge->IsConnected()));
            bridgeInfo.Set("streaming", Napi::Boolean::New(env, bridge->IsStreaming()));
            status.Set("bridge", bridgeInfo);
        }
    }
    
    return status;
}

Napi::Value HueWrapper::Shutdown(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    std::lock_guard<std::mutex> lock(mutex_);
    
    try {
        // First disable the effect
        if (manualEffect_ && hueStream_) {
            hueStream_->LockMixer();
            manualEffect_->Disable();
            // Note: Effects are cleared when ShutDown() is called
            hueStream_->UnlockMixer();
        }
        
        // Stop streaming if active (check actual status)
        if (hueStream_ && hueStream_->IsBridgeStreaming()) {
            hueStream_->Stop();
        }
        streaming_ = false;
        
        // Shutdown HueStream
        if (initialized_ && hueStream_) {
            hueStream_->ShutDown();
        }
        
        // Clean up all resources
        manualEffect_.reset();
        hueStream_.reset();
        config_.reset();
        initialized_ = false;
        connected_ = false;
        
        return Napi::Boolean::New(env, true);
        
    } catch (const std::exception& e) {
        return Napi::Boolean::New(env, false);
    }
}

// Module initialization
Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    // Initialize main wrapper
    HueWrapper::Init(env, exports);
    return exports;
}

NODE_API_MODULE(hue_addon, InitAll)