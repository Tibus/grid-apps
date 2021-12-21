#ifndef ExportPolyTreeAsyncWorker_H
#define ExportPolyTreeAsyncWorker_H

#include <iostream>
#include <napi.h>
#include <vector>
#include <math.h>

#include "../Shape2D.h"
#include "../lib/clipper.hpp"
#include "../utils/line.h"

#include "../vendors/utils/progress/AbstractAsyncProgress.h"
#include "../vendors/utils/napi/EmptyCallBack.h"
#include "../vendors/utils/napi/ParametersChecker.h"

class ExportPolyTree
{
  public:
    float minlen = 0.f;
    float maxlen = 0.f;
    float spacing = 1.f;
    float precision;
    float zPosition;
    std::vector<Line> lines;    
    bool result = false;
    static Napi::Value Init(const Napi::CallbackInfo& info, Shape2D *shape2D);
    Shape2D *shape2D;
    ExportPolyTree(Shape2D *shape2D, const Napi::Object &resource);
    
  protected:
    static void SafeExecute(void* data);
    Napi::Value Execute(Napi::Env env);
    Napi::Value OnOK(Napi::Env env);
    Napi::Value OnError(Napi::Env env);
    Napi::Object ExportPolyNode(ClipperLib::PolyNode *  nodes, Napi::Env env);
    void Export(Napi::Env env);
  
};
  
#endif