#include <napi.h>

Napi::Value test(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  return Napi::String::New(env, "coucou");
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  exports["test"] = Napi::Function::New(env, test);
  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)
