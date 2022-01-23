#ifndef ExportPolyTree_h
#define ExportPolyTree_h

#include <iostream>
#include <napi.h>
#include "../../lib/clipper.hpp"
#include "./ExportPolyNode.h"
#include "./ExportPolyContour.h"

Napi::Object ExportPolyTree(ClipperLib::PolyTree *polyTree, Napi::Env env);

#endif