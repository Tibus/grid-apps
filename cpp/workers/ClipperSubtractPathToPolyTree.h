#ifndef ClipperSubtractPathToPolyTreeWorker_H
#define ClipperSubtractPathToPolyTreeWorker_H

#include <iostream>
#include <napi.h>
#include <vector>

#include "../Shape2D.h"
#include "../lib/clipper.hpp"

#include "../vendors/utils/napi/EmptyCallBack.h"
#include "../vendors/utils/napi/ParametersChecker.h"
#include "./utils/ExportPolyTree.h"
#include "./utils/CleanPolyTree.h"

class ClipperSubtractPathToPolyTree
{
  public:
    ClipperLib::Clipper co;
    ClipperLib::PolyTree resultPolyTree;

    Napi::Array *polyA;
    Napi::Array *polyB;
    double clean;

    static Napi::Value Init(const Napi::CallbackInfo& info);
    
    ClipperSubtractPathToPolyTree(Napi::Array *polyA, Napi::Array *polyB, double clean, const Napi::Object &resource);
    
  protected:
    static void SafeExecute(void* data);
    Napi::Value Execute(Napi::Env env);
    Napi::Value OnOK(Napi::Env env);
    Napi::Value OnError(Napi::Env env);
    void ExecuteFunction(Napi::Env env);

    bool success;
};

  
#endif