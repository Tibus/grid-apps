#ifndef CleanClipperPolygons_H
#define CleanClipperPolygons_H

#include <iostream>
#include <napi.h>
#include <vector>

#include "../Shape2D.h"
#include "../lib/clipper.hpp"

#include "../vendors/utils/napi/EmptyCallBack.h"
#include "../vendors/utils/napi/ParametersChecker.h"

class CleanClipperPolygons
{
  public:
    double clean;
    static Napi::Value Init(const Napi::CallbackInfo& info, Shape2D *shape2D);
    Shape2D *shape2D;
    CleanClipperPolygons(double clean, Shape2D *shape2D, const Napi::Object &resource);
    
  protected:
    static void SafeExecute(void* data);
    Napi::Value Execute(Napi::Env env);
    Napi::Value OnOK(Napi::Env env);
    Napi::Value OnError(Napi::Env env);
    void Clean(Napi::Env env);
};

  
#endif