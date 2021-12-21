#include "Shape2D.h"
#include "./workers/AddPaths.h"
#include "./workers/AddPathsToOffset.h"
#include "./workers/ExecuteClipper.h"
#include "./workers/ExecuteClipperOffset.h"
#include "./workers/ExportLine.h"
#include "./workers/ExportPolyTree.h"

/**
 *  Class Initilisation
 */


Napi::Object Shape2D::Init(Napi::Env env, Napi::Object exports) {
  Napi::HandleScope scope(env);

  // define the "Shape2D" functions and values here
  Napi::Function func = DefineClass(env, "Shape2D", {
    InstanceMethod("addPaths", &Shape2D::addPath),
    InstanceMethod("addPathsToOffset", &Shape2D::addPathsToOffset),
    InstanceMethod("executeClipper", &Shape2D::executeClipper),
    InstanceMethod("executeClipperOffset", &Shape2D::executeClipperOffset),
    InstanceMethod("exportPolyTree", &Shape2D::exportPolyTree),
    InstanceMethod("exportLine", &Shape2D::exportLine)
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("Shape2D", func);

  return exports;
}

//****************************************************************//
//***********************  Constructor ***************************//
//****************************************************************//

Napi::FunctionReference Shape2D::constructor;
Shape2D::Shape2D(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Shape2D>(info) {

}



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
    Console::log(_path, "disposed");
  }
  return env.Null();
}

//****************************************************************//
//*************************  Methods *****************************//
//****************************************************************//


Napi::Value Shape2D::addPath(const Napi::CallbackInfo& info) {
  // Napi::Env env = info.Env();
  // return env.Null();
  return AddPaths::Init(info, this);
}


Napi::Value Shape2D::addPathsToOffset(const Napi::CallbackInfo& info) {
  // Napi::Env env = info.Env();
  // return env.Null();
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



