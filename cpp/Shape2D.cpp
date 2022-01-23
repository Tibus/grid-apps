#include "Shape2D.h"
#include "./workers/AddPaths.h"
#include "./workers/AddPathsToOffset.h"
#include "./workers/ExecuteClipper.h"
#include "./workers/ExecuteClipperOffset.h"
#include "./workers/ExportLine.h"
#include "./workers/ExportPolyTree.h"
#include "./workers/CleanClipperPolygons.h"
#include "./workers/CleanClipperAddon.h"
#include "./workers/ExportPolyFromPaths.h"
/**
 *  Class Initilisation
 */


Napi::Object Shape2D::Init(Napi::Env env, Napi::Object exports) {
  // Napi::HandleScope scope(env);

  // define the "Shape2D" functions and values here
  Napi::Function func = DefineClass(env, "Shape2D", {
    InstanceMethod("addPaths", &Shape2D::addPath),
    InstanceMethod("init", &Shape2D::init),
    InstanceMethod("addPathsToOffset", &Shape2D::addPathsToOffset),
    InstanceMethod("executeClipper", &Shape2D::executeClipper),
    InstanceMethod("executeClipperOffset", &Shape2D::executeClipperOffset),
    InstanceMethod("exportPolyTree", &Shape2D::exportPolyTree),
    InstanceMethod("exportLine", &Shape2D::exportLine),
    InstanceMethod("cleanClipperPolygons", &Shape2D::cleanClipperPolygons),
    InstanceMethod("cleanClipperAddon", &Shape2D::cleanClipperAddon),
    InstanceMethod("exportPolyFromPaths", &Shape2D::exportPolyFromPaths)
  });

  // constructor = Napi::Persistent(func);
  // constructor.SuppressDestruct();

  Napi::FunctionReference* constructor = new Napi::FunctionReference();
  *constructor = Napi::Persistent(func);

  exports.Set("Shape2D", func);

  env.SetInstanceData<Napi::FunctionReference>(constructor);

  return exports;
}

//****************************************************************//
//***********************  Constructor ***************************//
//****************************************************************//

Shape2D::Shape2D(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Shape2D>(info) {
  Napi::Env env = info.Env();

  Console::log("----constructor 1");
  Console::log("precision", precision);
  Console::log("test", test);
}

// Shape2D::Shape2D() : Napi::ObjectWrap<Shape2D>() {
//   Console::log("----constructor 2");
//   Console::log("precision", precision);
//   Console::log("test", test);
// }



//****************************************************************//
//***********************  Destructor ****************************//
//****************************************************************//

Shape2D::~Shape2D(){
  // std::cout << "destructor" << std::endl;
}


Napi::Value Shape2D::dispose(const Napi::CallbackInfo& info){
  Napi::Env env = info.Env();
  
  Napi::HandleScope scope(env);

  if(disposed == false){
    disposed = true;
    Console::log("Shape2D disposed");
  }
  return env.Null();
}

//****************************************************************//
//*************************  Methods *****************************//
//****************************************************************//


Napi::Value Shape2D::addPath(const Napi::CallbackInfo& info) {
  // Napi::Env env = info.Env();
  // return env.Null();
  Console::log("---addPath");
  Console::log("precision", precision);
  Console::log("test", test);

  return AddPaths::Init(info, this);
}


Napi::Value Shape2D::init(const Napi::CallbackInfo& info) {
  // Napi::Env env = info.Env();
  // return env.Null();
  Console::log("---init");

  ClipperLib::Paths mainPath;
  ClipperLib::PolyTree resultPolyTree;
  ClipperLib::Paths resultPaths;
  ClipperLib::Clipper clipper;
  ClipperLib::ClipperOffset clipperOffset;
  ClipperLib::Clipper c;
  ClipperLib::PolyTree soln;

  float shrinkValue{FLT_MAX};
  float precision{1};
  std::string test{"coucou"};

  // this->mainPath = mainPath;
  // this->resultPolyTree = resultPolyTree;
  // this->resultPaths = resultPaths;
  // this->clipper = clipper;
  this->clipperOffset = clipperOffset;
  // this->c = c;
  // this->soln = soln;

  this->shrinkValue = shrinkValue;
  this->precision = precision;
  this->test = test;

  
  Console::log("---init");
  Console::log("precision", precision);
  Console::log("test", test);

  return this->Value();
}

Napi::Value Shape2D::addPathsToOffset(const Napi::CallbackInfo& info) {
  // Napi::Env env = info.Env();
  // return env.Null();
  Console::log("---addPathsToOffset");
  Console::log("precision", precision);
  Console::log("test", test);

  return AddPathsToOffset::Init(info, this);
}

Napi::Value Shape2D::executeClipper(const Napi::CallbackInfo& info) {
  // Napi::Env env = info.Env();
  // return env.Null();
  return ExecuteClipper::Init(info, this);
}

Napi::Value Shape2D::executeClipperOffset(const Napi::CallbackInfo& info) {
  
  return ExecuteClipperOffset::Init(info, this);
}

Napi::Value Shape2D::exportLine(const Napi::CallbackInfo& info) {
  // Napi::Env env = info.Env();
  // return env.Null();
  return ExportLine::Init(info, this);
}

Napi::Value Shape2D::exportPolyTree(const Napi::CallbackInfo& info) {
  // Napi::Env env = info.Env();
  // return env.Null();
  return ExportPolyTree::Init(info, this);
}

Napi::Value Shape2D::cleanClipperPolygons(const Napi::CallbackInfo& info) {
  // Napi::Env env = info.Env();
  // return env.Null();
  return CleanClipperPolygons::Init(info, this);
}

Napi::Value Shape2D::cleanClipperAddon(const Napi::CallbackInfo& info) {
  // Napi::Env env = info.Env();
  // return env.Null();
  return CleanClipperAddon::Init(info, this);
}

Napi::Value Shape2D::exportPolyFromPaths(const Napi::CallbackInfo& info) {
  // Napi::Env env = info.Env();
  // return env.Null();
  return ExportPolyFromPaths::Init(info, this);
}



