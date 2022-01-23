#ifndef ClipperDualSubtractPathToPolyTreeWorker_H
#define ClipperDualSubtractPathToPolyTreeWorker_H

#include <iostream>
#include <napi.h>
#include <vector>

#include "../Shape2D.h"
#include "../lib/clipper.hpp"

#include "../vendors/utils/napi/EmptyCallBack.h"
#include "../vendors/utils/napi/ParametersChecker.h"
#include "./utils/ExportPolyTree.h"
#include "./utils/CleanPolyTree.h"

class ClipperDualSubtractPathToPolyTree
{
  public:
    ClipperLib::Clipper co;
    ClipperLib::PolyTree resultPolyTreeA;
    ClipperLib::PolyTree resultPolyTreeB;

    Napi::Array *polyA;
    Napi::Array *polyB;
    double clean;
    bool needOa;
    bool needOb;

    static Napi::Value Init(const Napi::CallbackInfo& info);
    
    ClipperDualSubtractPathToPolyTree(Napi::Array *polyA, Napi::Array *polyB, double clean, bool needOa, bool needOb, const Napi::Object &resource);
    
  protected:
    static void SafeExecute(void* data);
    Napi::Value Execute(Napi::Env env);
    Napi::Value OnOK(Napi::Env env);
    Napi::Value OnError(Napi::Env env);
    void ExecuteFunction(Napi::Env env);

    bool success;
};

  
#endif