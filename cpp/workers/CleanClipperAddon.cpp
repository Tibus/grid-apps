#include "./CleanClipperAddon.h"
#include "../vendors/utils/log.h"
#include "../vendors/utils/heapMutex.h"
#include "../vendors/utils/except.h"

#include <fstream>

#include "../lib/clipper.hpp"

#ifdef _WIN32
#include <Windows.h>
#include <string>
#endif

/**
 *  static javascript interface initializer
 */
Napi::Value CleanClipperAddon::Init(const Napi::CallbackInfo& info, Shape2D *shape2D) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
  std::string checkResult = ParametersChecker(info, "Shape2D add path", {});
  if (checkResult != "") {
    return Napi::String::New(env, checkResult);
  }
  
  CleanClipperAddon *worker = new CleanClipperAddon( shape2D, Napi::Object::New(info.Env()));
  return worker->Execute(env);
}

/**
 *  Constructor
 */
CleanClipperAddon::CleanClipperAddon(Shape2D *shape2D, const Napi::Object &resource)
: shape2D(shape2D)
{
}

  class SafeExecuteData
{
public:
  CleanClipperAddon* m_obj;
  Napi::Env*        m_env;
};

void CleanClipperAddon::SafeExecute(void* data)
{
  SafeExecuteData* executeData = static_cast<SafeExecuteData*>(data);
  executeData->m_obj->Clean(*executeData->m_env);
}

Napi::Value CleanClipperAddon::Execute(Napi::Env env) {
  //Console::log("CleanClipperAddon ---->");
  ////Console::time("Colision with rays");

  SafeExecuteData executeData;
  executeData.m_obj = this;
  executeData.m_env = &env;
  if (!safeExecuteFunc(SafeExecute, &executeData))
    return this->OnError(env);

 // //Console::timeEnd("Colision with rays");
 return this->OnOK(env);
}

void CleanClipperAddon::Clean(Napi::Env env) {
  shape2D->mainPath.clear();
  shape2D->resultPolyTree.Clear();
  shape2D->resultPaths.clear();
  shape2D->clipper.Clear();
  shape2D->soln.Clear();
  shape2D->c.Clear();
}

Napi::Value CleanClipperAddon::OnError(Napi::Env env) {
  Napi::HandleScope scope(env);

  // reject promise with error value
  // Call empty function
  Napi::Object props = Napi::Object::New(env);
  
  props.Set("success", Napi::Boolean::New(env, false));
  props.Set("error", Napi::String::New(env, "CleanClipperAddon error "));

   return props;
}

Napi::Value CleanClipperAddon::OnOK(Napi::Env env) {
  
 
  Napi::HandleScope scope(env);
  Napi::Object props = Napi::Object::New(env);


  props.Set("success", Napi::Boolean::New(env, true));

  return props;
}