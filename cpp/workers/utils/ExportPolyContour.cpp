#include "ExportPolyNode.h"
#include "../../utils/log.h"

/**
 *  static javascript interface initializer
 */

Napi::Buffer<int32_t> ExportPolyContour(ClipperLib::Path *node, Napi::Env env){
  

  // Napi::Array polygon = Napi::Array::New(env, node->size());
  // for(uint32_t index =0; index < node->size(); index++ ){
  //   Napi::Object point = Napi::Object::New(env);
  //   point.Set("X", node->index].X);
  //   point.Set("Y", node->index].Y);
  //   polygon.Set(index, point);
  // }

  int32_t *poly2 = (int32_t *)malloc(sizeof(int32_t) * node->size() * 2);

  // int32_t *poly2 = new int32_t(node->size() * 2);

  // Console::log("node->size()", node->size());

  for(uint32_t index =0; index < node->size(); index++ ){
    poly2[index*2] = node->at(index).X;
    poly2[index*2+1] = node->at(index).Y;
  }

  // Console::log("poly2", poly2);

  return Napi::Buffer<int32_t>::New(env, poly2, node->size() * 2);
}
