#ifndef AddPathsAsyncWorker_H
#define AddPathsAsyncWorker_H

#include <iostream>
#include <napi.h>
#include <vector>

#include "../Shape2D.h"
#include "../lib/clipper.hpp"

#include "../vendors/utils/napi/EmptyCallBack.h"
#include "../vendors/utils/napi/ParametersChecker.h"

class AddPaths
{
  public:
    ClipperLib::Paths path;
    uint32_t polyTypeInt;
    bool closed;
    static Napi::Value Init(const Napi::CallbackInfo& info, Shape2D *shape2D);
    Shape2D *shape2D;
    AddPaths(ClipperLib::Paths path, uint32_t polyTypeInt, bool closed,  Shape2D *shape2D, const Napi::Object &resource);
    
  protected:
    static void SafeExecute(void* data);
    Napi::Value Execute(Napi::Env env);
    Napi::Value OnOK(Napi::Env env);
    Napi::Value OnError(Napi::Env env);
    void AddP(Napi::Env env);
};

  
#endif