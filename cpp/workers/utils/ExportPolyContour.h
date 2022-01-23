#ifndef ExportPolyContour_h
#define ExportPolyContour_h

#include <iostream>
#include <napi.h>
#include "../../lib/clipper.hpp"
#include "./ExportPolyContour.h"

Napi::Buffer<int32_t> ExportPolyContour(ClipperLib::Path *node, Napi::Env env);

#endif