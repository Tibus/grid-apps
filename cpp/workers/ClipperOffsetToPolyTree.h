#ifndef ClipperOffsetToPolyTreeAsyncWorker_H
#define ClipperOffsetToPolyTreeAsyncWorker_H

#include <iostream>
#include <napi.h>
#include <vector>

#include "../Shape2D.h"
#include "../lib/clipper.hpp"

#include "../vendors/utils/napi/EmptyCallBack.h"
#include "../vendors/utils/napi/ParametersChecker.h"

class ClipperOffsetToPolyTree
{
  public:
    ClipperLib::ClipperOffset co;
    ClipperLib::PolyTree resultPolyTree;

    uint8_t joinTypeInt;
    uint8_t endTypeInt;
    bool clean;
    double cleanDistance;
    bool simple;
    uint8_t fillTypeInt;
    double offset;
    float precision;
    Napi::Array *polys;

    static Napi::Value Init(const Napi::CallbackInfo& info);
    
    ClipperOffsetToPolyTree(Napi::Array *polys, uint8_t joinTypeInt,  uint8_t endTypeInt, bool clean, double cleanDistance, bool simple, uint8_t fillTypeInt, double  offset, float precision, const Napi::Object &resource);
    
  protected:
    static void SafeExecute(void* data);
    Napi::Value Execute(Napi::Env env);
    Napi::Value OnOK(Napi::Env env);
    Napi::Value OnError(Napi::Env env);
    Napi::Object ExportPolyNode(ClipperLib::PolyNode *  nodes, Napi::Env env);
    void ExecuteFunction(Napi::Env env);
};

  
#endif