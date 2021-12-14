{
    "targets": [{
        "target_name": "gridapp",
        "cflags!": [ "-fexceptions", "--max-old-space-size=3000" ],
        "cflags_cc!": [ "-fexceptions", "-fno-rtti", "-fno-exceptions" ],
        "sources": [
            "cpp/main.cpp",
        ],
        'include_dirs': [
            "<!@(node -p \"require('node-addon-api').include\")",
        ],
        'libraries': [
        ],
        'dependencies': [
            "<!(node -p \"require('node-addon-api').gyp\")"
        ],
       'conditions': [
        ['OS=="win"', {
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1
            }
          }
        }],
        ['OS=="mac"', {
          "xcode_settings": {
            "CLANG_CXX_LIBRARY": "libc++",
            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
            'GCC_ENABLE_CPP_RTTI': 'YES',
            'MACOSX_DEPLOYMENT_TARGET': '10.8'
          }
        }],
        ['OS=="linux"', {
          "CLANG_CXX_LIBRARY": "libc++",
          'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
          'GCC_ENABLE_CPP_RTTI': 'YES',
        }]
      ],
      'defines': [
        'NAPI_CPP_EXCEPTIONS',
        'TASKING_INTERNAL'
      ]
    }]
}
