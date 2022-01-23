#ifndef CleanPolyTree_h
#define CleanPolyTree_h

#include <iostream>
#include <napi.h>
#include "../../lib/clipper.hpp"
#include "./ExportPolyNode.h"
#include "./ExportPolyContour.h"

Napi::Object CleanPolyTree(ClipperLib::PolyNodes *PolyNodes, double clean);

#endif