#ifndef ClipperFillAreaToPolyTreeWorker_H
#define ClipperFillAreaToPolyTreeWorker_H

#include <iostream>
#include <napi.h>
#include <vector>

#include "../Shape2D.h"
#include "../lib/clipper.hpp"

#include "../vendors/utils/napi/EmptyCallBack.h"
#include "../vendors/utils/napi/ParametersChecker.h"
#include "./utils/ExportPolyTree.h"
#include "./utils/CleanPolyTree.h"

class ClipperFillAreaToPolyTree
{
  public:
    ClipperLib::Clipper co;
    ClipperLib::PolyTree resultPolyTree;

    Napi::ArrayBuffer *polyA;
    Napi::Array *polyB;

    static Napi::Value Init(const Napi::CallbackInfo& info);
    
    ClipperFillAreaToPolyTree(Napi::ArrayBuffer *polyA, Napi::Array *polyB, const Napi::Object &resource);
    
  protected:
    static void SafeExecute(void* data);
    Napi::Value Execute(Napi::Env env);
    Napi::Value OnOK(Napi::Env env);
    Napi::Value OnError(Napi::Env env);
    void ExecuteFunction(Napi::Env env);

    bool success;
};

  
#endif