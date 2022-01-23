#ifndef ExportPolyNode_H
#define ExportPolyNode_H

#include <iostream>
#include <napi.h>
#include "../../lib/clipper.hpp"
#include "./ExportPolyContour.h"

Napi::Object ExportPolyNode(ClipperLib::PolyNode *node, Napi::Env env);

#endif