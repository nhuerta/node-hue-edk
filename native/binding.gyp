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
        "../../EDK/build/external_install/include",
        "../../EDK/build/external_install/include/libjson",
        "../../EDK/3rd_party/boost/src/boost_1_82_0",
        "../../EDK/libhuestream/huestream/effect",
        "../../EDK/libhuestream/huestream/effect/effects",
        "../../EDK/libhuestream/huestream/common"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "NODE_ADDON_API_DISABLE_DEPRECATED",
        "NGHTTP2_STATICLIB",
        "CURL_STATICLIB"
      ],
      "conditions": [
        ["OS=='mac'", {
          "libraries": [
            "<(module_root_dir)/../../EDK/build/bin/libhuestream.a",
            "<(module_root_dir)/../../EDK/build/libhuestream/support/libsupport.a",
            "<(module_root_dir)/../../EDK/build/libhuestream/bridgediscovery/libbridge_discovery.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libmbedtls.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libmbedcrypto.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libmbedx509.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libmbedcl_wrapper.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libedtls_client.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libjson.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libcurl.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libmdns_responder.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libnghttp2_static.a"
          ],
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
            "MACOSX_DEPLOYMENT_TARGET": "12.0",
            "OTHER_CPLUSPLUSFLAGS": ["-std=c++17", "-Wno-dynamic-exception-spec"]
          }
        }],
        ["OS=='win'", {
          "defines": [
            "_WIN32_WINNT=0x0600",
            "NOMINMAX"
          ],
          "libraries": [
            "<(module_root_dir)/../../EDK/build/bin/huestream.lib",
            "<(module_root_dir)/../../EDK/build/bin/support.lib",
            "<(module_root_dir)/../../EDK/build/bin/bridge_discovery.lib",
            "<(module_root_dir)/../../EDK/build/external_install/lib/mbedtls.lib",
            "<(module_root_dir)/../../EDK/build/external_install/lib/mbedcrypto.lib",
            "<(module_root_dir)/../../EDK/build/external_install/lib/mbedx509.lib",
            "<(module_root_dir)/../../EDK/build/external_install/lib/mbedcl_wrapper.lib",
            "<(module_root_dir)/../../EDK/build/external_install/lib/edtls_client.lib",
            "<(module_root_dir)/../../EDK/build/external_install/lib/json.lib",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libcurl.lib",
            "<(module_root_dir)/../../EDK/build/external_install/lib/mdns_responder.lib",
            "<(module_root_dir)/../../EDK/build/external_install/lib/nghttp2_static.lib",
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
        }],
        ["OS=='linux'", {
          "libraries": [
            "<(module_root_dir)/../../EDK/build/bin/libhuestream.a",
            "<(module_root_dir)/../../EDK/build/libhuestream/support/libsupport.a",
            "<(module_root_dir)/../../EDK/build/libhuestream/bridgediscovery/libbridge_discovery.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libmbedtls.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libmbedcrypto.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libmbedx509.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libmbedcl_wrapper.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libedtls_client.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libjson.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libcurl.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libmdns_responder.a",
            "<(module_root_dir)/../../EDK/build/external_install/lib/libnghttp2_static.a"
          ],
          "cflags_cc": ["-std=c++17", "-fexceptions"],
          "cflags!": ["-fno-exceptions"]
        }]
      ]
    }
  ]
}
