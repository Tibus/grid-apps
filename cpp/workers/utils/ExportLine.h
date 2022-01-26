#ifndef ExportLine_h
#define ExportLine_h

#include <iostream>
#include <napi.h>
#include "../../lib/clipper.hpp"

Napi::Buffer<int32_t> ExportLine(ClipperLib::PolyTree *polyTree, Napi::Env env);

#endif