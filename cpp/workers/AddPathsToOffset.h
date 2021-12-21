#ifndef AddPathsToOffsetAsyncWorker_H
#define AddPathsToOffsetAsyncWorker_H

#include <iostream>
#include <napi.h>
#include <vector>

#include "../Shape2D.h"
#include "../lib/clipper.hpp"

#include "../vendors/utils/napi/EmptyCallBack.h"
#include "../vendors/utils/napi/ParametersChecker.h"

class AddPathsToOffset
{
  public:
    ClipperLib::Paths path;
    uint8_t joinTypeInt;
    uint8_t endTypeInt;
    bool clean;
    double cleanDistance;
    bool simple;
    uint8_t fillTypeInt;
    static Napi::Value Init(const Napi::CallbackInfo& info, Shape2D *shape2D);
    Shape2D *shape2D;
    AddPathsToOffset(ClipperLib::Paths path, uint8_t joinTypeInt,  uint8_t endTypeInt, bool clean, double cleanDistance, bool simple, uint8_t fillTypeInt, Shape2D *shape2D, const Napi::Object &resource);
    
  protected:
    static void SafeExecute(void* data);
    Napi::Value Execute(Napi::Env env);
    Napi::Value OnOK(Napi::Env env);
    Napi::Value OnError(Napi::Env env);
    void AddP(Napi::Env env);
};

  
#endif