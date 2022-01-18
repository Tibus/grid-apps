#ifndef ExportPolyFromPaths_H
#define ExportPolyFromPaths_H

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

class ExportPolyFromPaths
{
  public:    
    bool result = false;
    static Napi::Value Init(const Napi::CallbackInfo& info, Shape2D *shape2D);
    Shape2D *shape2D;
    ExportPolyFromPaths(Shape2D *shape2D, const Napi::Object &resource);
    
  protected:
    static void SafeExecute(void* data);
    Napi::Value Execute(Napi::Env env);
    Napi::Value OnOK(Napi::Env env);
    Napi::Value OnError(Napi::Env env);
    void Export(Napi::Env env);
  
};
  
#endif