#include <napi.h>
#include "./Shape2D.h"
#include "./workers/ClipperOffsetToPolyTree.h"
#include "./workers/ClipperSubtractPathToPolyTree.h"
#include "./workers/ClipperDualSubtractPathToPolyTree.h"
#include "./workers/ClipperFillAreaToPolyTree.h"

void setDebug(const Napi::CallbackInfo &info){
  bool debug = info[0].As<Napi::Boolean>().Value();

  Console::debugEnabled = debug;
}

void logAll(const Napi::CallbackInfo &info){
  Console::logTimers();
}

Napi::Value test(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  return Napi::String::New(env, "coucou1");
}

static Napi::Value ClipperOffsetToPolyTree(const Napi::CallbackInfo &info) {
  // Console::time("ClipperOffsetToPolyTree");
  auto res = ClipperOffsetToPolyTree::Init(info);
  // Console::timeStep("ClipperOffsetToPolyTree");

  return res;
}

static Napi::Value ClipperSubtractPathToPolyTree(const Napi::CallbackInfo &info) {
  // Console::time("ClipperSubtractPathToPolyTree");
  auto res = ClipperSubtractPathToPolyTree::Init(info);
  // Console::timeStep("ClipperSubtractPathToPolyTree");

  return res;
}

static Napi::Value ClipperDualSubtractPathToPolyTree(const Napi::CallbackInfo &info) {
  // Console::time("ClipperDualSubtractPathToPolyTree");
  auto res = ClipperDualSubtractPathToPolyTree::Init(info);
  // Console::timeStep("ClipperDualSubtractPathToPolyTree");

  return res;
}

static Napi::Value ClipperFillAreaToPolyTree(const Napi::CallbackInfo &info) {
  // Console::time("ClipperFillAreaToPolyTree");
  auto res = ClipperFillAreaToPolyTree::Init(info);
  // Console::timeStep("ClipperFillAreaToPolyTree");

  return res;
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  Shape2D::Init(env, exports);
  exports["test"] = Napi::Function::New(env, test);
  exports["logAll"] = Napi::Function::New(env, logAll);
  exports["setDebug"] = Napi::Function::New(env, setDebug);

  exports["clipperOffsetToPolyTree"] = Napi::Function::New(env, ClipperOffsetToPolyTree);
  exports["clipperSubtractPathToPolyTree"] = Napi::Function::New(env, ClipperSubtractPathToPolyTree);
  exports["clipperDualSubtractPathToPolyTree"] = Napi::Function::New(env, ClipperDualSubtractPathToPolyTree);
  exports["clipperFillAreaToPolyTree"] = Napi::Function::New(env, ClipperFillAreaToPolyTree);
  return exports;
}


NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)
