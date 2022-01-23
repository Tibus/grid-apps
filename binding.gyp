{
    "targets": [{
        "target_name": "gridapp",
        "cflags!": [ "-fexceptions", "--max-old-space-size=3000" ],
        "cflags_cc!": [ "-fexceptions", "-fno-rtti", "-fno-exceptions" ],
        "sources": [
            "cpp/main.cpp",

            "cpp/Shape2D.cpp",
            "cpp/workers/AddPaths.cpp",
            "cpp/workers/ExecuteClipper.cpp",
            "cpp/workers/ExecuteClipperOffset.cpp",
            "cpp/workers/ExportLine.cpp",
            "cpp/workers/ExportPolyTree.cpp",
            "cpp/workers/AddPathsToOffset.cpp",
            "cpp/workers/CleanClipperPolygons.cpp",
            "cpp/workers/CleanClipperAddon.cpp",
            "cpp/workers/ExportPolyFromPaths.cpp",

            "cpp/workers/ClipperOffsetToPolyTree.cpp",
            "cpp/workers/ClipperSubtractPathToPolyTree.cpp",
            "cpp/workers/ClipperDualSubtractPathToPolyTree.cpp",
            "cpp/workers/ClipperFillAreaToPolyTree.cpp",
            "cpp/workers/utils/ExportPolyTree.cpp",
            "cpp/workers/utils/ExportPolyNode.cpp",
            "cpp/workers/utils/ExportPolyContour.cpp",
            "cpp/workers/utils/CleanPolyTree.cpp",

            "cpp/lib/clipper.cpp",
            "<!@(node -p \"var fs=require('fs'),path=require('path'),walk=function(r){let t,e=[],n=null;try{t=fs.readdirSync(r)}catch(r){n=r.toString()}if(n)return n;var a=0;return function n(){var i=t[a++];if(!i)return e;let u=path.resolve(r,i);i=r+'/'+i;let c=fs.statSync(u);if(c&&c.isDirectory()){let r=walk(i);return e=e.concat(r),n()}return e.push(i),n()}()};walk('./cpp/vendors/utils/').join(' ');\")"
            ],
        'include_dirs': [
            "<!@(node -p \"require('node-addon-api').include\")",
            "cpp/vendors/Eigen",
            "cpp/vendors/libigl/include",
            "cpp/vendors/utils",
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
