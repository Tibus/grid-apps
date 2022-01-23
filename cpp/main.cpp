#include <napi.h>
#include "./Shape2D.h"
#include "./workers/ClipperOffsetToPolyTree.h"

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
  Console::time("ClipperOffsetToPolyTree");
  auto res = ClipperOffsetToPolyTree::Init(info);
  Console::timeStep("ClipperOffsetToPolyTree");

  return res;
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  Shape2D::Init(env, exports);
  exports["test"] = Napi::Function::New(env, test);
  exports["logAll"] = Napi::Function::New(env, logAll);
  exports["setDebug"] = Napi::Function::New(env, setDebug);

  exports["clipperOffsetToPolyTree"] = Napi::Function::New(env, ClipperOffsetToPolyTree);
  return exports;
}


NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)
