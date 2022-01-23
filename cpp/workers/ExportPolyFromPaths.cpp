#include "./ExportPolyFromPaths.h"
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


Napi::Value ExportPolyFromPaths::Init(const Napi::CallbackInfo& info, Shape2D *shape2D) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  std::string checkResult = ParametersChecker(info, "Shape2D add path", {});
  if (checkResult != "") {
    return Napi::String::New(env, checkResult);
  }
 
  ExportPolyFromPaths *worker = new ExportPolyFromPaths( shape2D, Napi::Object::New(info.Env()));
  return worker->Execute(env);

}

/**
 *  Constructor
 */
ExportPolyFromPaths::ExportPolyFromPaths(Shape2D *shape2D, const Napi::Object &resource)
  : shape2D(shape2D)
  {
  }

  class SafeExecuteData
{
public:
  ExportPolyFromPaths* m_obj;
  Napi::Env*        m_env;
};

void ExportPolyFromPaths::SafeExecute(void* data)
{
  SafeExecuteData* executeData = static_cast<SafeExecuteData*>(data);
  executeData->m_obj->Export(*executeData->m_env);
}

Napi::Value ExportPolyFromPaths::Execute(Napi::Env env) {
  Console::log("ColisionWithPath ---->");

  SafeExecuteData executeData;
  executeData.m_obj = this;
  executeData.m_env = &env;
  if (!safeExecuteFunc(SafeExecute, &executeData))
    return this->OnError(env);

 // //Console::timeEnd("Colision with rays");
 return this->OnOK(env);
}

void ExportPolyFromPaths::Export(Napi::Env env) {
  //Console::log("ExportPolyFromPaths", shape2D->resultPaths);
}

Napi::Value ExportPolyFromPaths::OnError(Napi::Env env) {
  Napi::HandleScope scope(env);

  Console::log("<---- ExportPolyFromPaths error");

  // reject promise with error value
  // Call empty function
  Napi::Object props = Napi::Object::New(env);
  
  props.Set("success", Napi::Boolean::New(env, false));
  props.Set("error", Napi::String::New(env, "ExportPolyFromPaths error "));

  return props;
}

Napi::Value ExportPolyFromPaths::OnOK(Napi::Env env) {
  Console::log("<---- ExportPolyFromPaths");

  
  Napi::Object props = Napi::Object::New(env);
  uint64_t pathsSize = 0; 
  for(uint32_t index = 0; index < shape2D->resultPaths.size(); index ++){
      pathsSize += shape2D->resultPaths[index].size(); 
  }


  Napi::Array pointsJS = Napi::Array::New(env, pathsSize);
  uint64_t count = 0;
  //Console::log("pathsSize", pathsSize, shape2D->resultPaths.size());
  for(uint32_t index = 0; index < shape2D->resultPaths.size(); index ++){
    
    for(uint32_t j = 0; j < shape2D->resultPaths[index].size(); j ++){

      Napi::Object point = Napi::Object::New(env);
      point.Set("X",shape2D->resultPaths[index][j].X);
      point.Set("Y", shape2D->resultPaths[index][j].Y);
      pointsJS.Set(count,point);
      count++;
    }
  }
  props.Set("success", Napi::Boolean::New(env, result));
  props.Set("points", pointsJS);

 return props;
}
