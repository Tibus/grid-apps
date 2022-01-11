#include <napi.h>
#include "./Shape2D.h"

void setDebug(const Napi::CallbackInfo &info){
  bool debug = info[0].As<Napi::Boolean>().Value();

  Console::debugEnabled = debug;
}

Napi::Value test(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  return Napi::String::New(env, "coucou1");
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  Shape2D::Init(env, exports);
  exports["test"] = Napi::Function::New(env, test);
  return exports;
}


NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)
