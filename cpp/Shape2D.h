#ifndef D2_Shape_H
#define D2_Shape_H

#include <iostream>
#include <napi.h>
#include <float.h>
#include "./vendors/utils/log.h"
#include "./lib/clipper.hpp"

class Shape2D : public Napi::ObjectWrap<Shape2D> {
public:
  // Init function for setting the export key to JS
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  // Constructor to initialise
  Shape2D(const Napi::CallbackInfo &info);
  Shape2D();

  ~Shape2D();
  
  ClipperLib::Paths mainPath;
  
  ClipperLib::PolyTree resultPolyTree;
  ClipperLib::Paths resultPaths;

  ClipperLib::Clipper clipper;
  ClipperLib::ClipperOffset clipperOffset;

  float shrinkValue = FLT_MAX;
  float precision = 1;
  std::vector<bool> isHoleArray;
  std::string _path;

  //Console::time("segmentArray");
  ClipperLib::Clipper c;
  ClipperLib::PolyTree soln;

private:
  // reference to store the class definition that needs to be exported to JS
  static Napi::FunctionReference constructor;
 
  /*
  Method
  */
 
  Napi::Value dispose(const Napi::CallbackInfo& info);
  Napi::Value addPath(const Napi::CallbackInfo& info);
  Napi::Value addPathsToOffset(const Napi::CallbackInfo& info);
  Napi::Value executeClipper(const Napi::CallbackInfo& info);
  Napi::Value executeClipperOffset(const Napi::CallbackInfo& info);
  Napi::Value exportLine(const Napi::CallbackInfo& info);
  Napi::Value exportPolyTree(const Napi::CallbackInfo& info);
  Napi::Value cleanClipperPolygons(const Napi::CallbackInfo& info);
  Napi::Value cleanClipperAddon(const Napi::CallbackInfo& info);
  Napi::Value exportPolyFromPaths(const Napi::CallbackInfo& info);
  
  bool disposed = false;
};
#endif /* Geometry_H */
