#include "./ExportPolyTree.h"
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


Napi::Value ExportPolyThree::Init(const Napi::CallbackInfo& info, Shape2D *shape2D) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  std::string checkResult = ParametersChecker(info, "Shape2D add path", { napi_number, napi_number , napi_number, napi_number , napi_number});
  if (checkResult != "") {
    return Napi::String::New(env, checkResult);
  }
  float minlen =  info[0].As<Napi::Number>().FloatValue();
  float maxlen =  info[1].As<Napi::Number>().FloatValue();
  float spacing =  info[2].As<Napi::Number>().FloatValue();
  float precision =  info[3].As<Napi::Number>().FloatValue();
  float zPosition =  info[4].As<Napi::Number>().FloatValue();
 
  ExportPolyThree *worker = new ExportPolyThree(minlen, maxlen, spacing, precision, zPosition, shape2D, Napi::Object::New(info.Env()));
  return worker->Execute(env);

}

/**
 *  Constructor
 */
ExportPolyThree::ExportPolyThree(float minlen,float maxlen, float spacing, float precision, float zPosition, Shape2D *shape2D, const Napi::Object &resource)
  : shape2D(shape2D), minlen(minlen), maxlen(maxlen), spacing(spacing), precision(precision), zPosition(zPosition)
  {
  }

  class SafeExecuteData
{
public:
  ExportPolyThree* m_obj;
  Napi::Env*        m_env;
};

void ExportPolyThree::SafeExecute(void* data)
{
  SafeExecuteData* executeData = static_cast<SafeExecuteData*>(data);
  executeData->m_obj->Export(*executeData->m_env);
}

Napi::Value ExportPolyThree::Execute(Napi::Env env) {
  //Console::log("ColisionWithPath ---->");
  ////Console::time("Colision with rays");

  SafeExecuteData executeData;
  executeData.m_obj = this;
  executeData.m_env = &env;
  if (!safeExecuteFunc(SafeExecute, &executeData))
    return this->OnError(env);

 // //Console::timeEnd("Colision with rays");
 return this->OnOK(env);
}



void ExportPolyThree::Export(Napi::Env env) {
  // Console::log("----> ExportPolyThree");
}

Napi::Value ExportPolyThree::OnError(Napi::Env env) {
  Napi::HandleScope scope(env);

  // reject promise with error value
  // Call empty function
  Napi::Object props = Napi::Object::New(env);
  
  props.Set("success", Napi::Boolean::New(env, false));
  props.Set("error", Napi::String::New(env, "ExportPolyThree error "));

  return props;
}

Napi::Value ExportPolyThree::OnOK(Napi::Env env) {
  // Console::log("<---- ExportPolyThree", lines.size());

  // Console::time("exportToView");
 
  Napi::HandleScope scope(env);
  Napi::Object props = Napi::Object::New(env);
  Napi::Array linesJS = Napi::Array::New(env, lines.size());
  uint32_t one = 1;
  uint32_t zero = 0;
  for(uint64_t index = 0; index < lines.size(); index++){
    Line line = lines[index];
    Napi::Array lineJS = Napi::Array::New(env,2);
    Napi::Object point1 = Napi::Object::New(env);
    point1.Set("X", line.p1.x);
    point1.Set("Y", line.p1.y);
    point1.Set("Z", line.p1.z);
    Napi::Object point2 = Napi::Object::New(env);
    point2.Set("X", line.p2.x);
    point2.Set("Y", line.p2.y);
    point2.Set("Z", line.p2.z);
    lineJS.Set(zero, point1);
    lineJS.Set(one , point2);
    // lineJS[0] = point1;
    // lineJS[1] = point2;
    linesJS.Set(index, lineJS);
  }
  props.Set("lines", linesJS);
  props.Set("success", Napi::Boolean::New(env, result));

  // Console::timeEnd("exportToView");

 return props;
}
