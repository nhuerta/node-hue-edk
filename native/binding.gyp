{
  "targets": [
    {
      "target_name": "hue_edk",
      "sources": [
        "hue_edk.cpp",
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "../../EDK/libhuestream",
        "../../EDK/libhuestream/huestream",
        "../../EDK/libhuestream/support/include",
        "../../EDK/libhuestream/bridgediscovery/include",
        "../../EDK/libhuestream/huestream/connect",
        "../../EDK/build-fresh/external_install/include",
        "../../EDK/build-fresh/external_install/include/libjson",
        "../../EDK/3rd_party/boost/src/boost_1_82_0",
        "../../EDK/libhuestream/huestream/effect",
        "../../EDK/libhuestream/huestream/effect/effects",
        "../../EDK/libhuestream/huestream/common"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "NODE_ADDON_API_DISABLE_DEPRECATED",
        "_WIN32_WINNT=0x0600",
        "NOMINMAX",
        "NGHTTP2_STATICLIB",
        "CURL_STATICLIB"
      ],
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "<(module_root_dir)/../../EDK/build-fresh/bin/huestream.lib",
            "<(module_root_dir)/../../EDK/build-fresh/bin/support.lib",
            "<(module_root_dir)/../../EDK/build-fresh/bin/bridge_discovery.lib",
            "<(module_root_dir)/../../EDK/build-fresh/external_install/lib/mbedtls.lib",
            "<(module_root_dir)/../../EDK/build-fresh/external_install/lib/mbedcrypto.lib",
            "<(module_root_dir)/../../EDK/build-fresh/external_install/lib/mbedx509.lib",
            "<(module_root_dir)/../../EDK/build-fresh/external_install/lib/mbedcl_wrapper.lib",
            "<(module_root_dir)/../../EDK/build-fresh/external_install/lib/edtls_client.lib",
            "<(module_root_dir)/../../EDK/build-fresh/external_install/lib/json.lib",
            "<(module_root_dir)/../../EDK/build-fresh/external_install/lib/libcurl.lib",
            "<(module_root_dir)/../../EDK/build-fresh/external_install/lib/mdns_responder.lib",
            "<(module_root_dir)/../../EDK/build-fresh/external_install/lib/nghttp2_static.lib",
            "ws2_32.lib",
            "iphlpapi.lib",
            "winhttp.lib",
            "crypt32.lib",
            "netapi32.lib"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/std:c++17", "/EHsc", "/Os", "/Oy", "/GL", "/Gw", "/Gy", "/GS-"],
              "RuntimeLibrary": 0,
              "DebugInformationFormat": 0,
              "Optimization": 1,
              "FavorSizeOrSpeed": 2,
              "WholeProgramOptimization": "true",
              "InlineFunctionExpansion": 0,
              "EnableIntrinsicFunctions": "true",
              "OmitFramePointers": "true",
              "StringPooling": "true",
              "BufferSecurityCheck": "false"
            },
            "VCLinkerTool": {
              "LinkTimeCodeGeneration": 1,
              "OptimizeReferences": 2,
              "EnableCOMDATFolding": 2,
              "AdditionalOptions": ["/OPT:ICF", "/OPT:REF", "/LTCG"]
            }
          }
        }]
      ]
    }
  ]
}