#include "ExportLine.h"
#include "../../utils/log.h"


Napi::Buffer<int32_t> ExportLine(ClipperLib::PolyTree * tree, Napi::Env env){

  //Napi::Object polyNode = Napi::Object::New(env);


  int32_t *poly2 = (int32_t *)malloc(sizeof(int32_t) * tree->Total() * 2);

//    while (polynode){
//     perim = getPerimFromChild(polynode);
//     if ((minlen > 0.0 && perim < minlen)||(maxlen > 0.0 && perim > maxlen)){
//       //Console::log("on passe par le return", maxlen, minlen, perim);
//       polynode = polynode->GetNext();
//       result = false;
//       return;
//     }
//     Line line;
//     ClipperLib::IntPoint p1, p2;
//     p1 = polynode->Contour[0];
//     line.p1.x = p1.X/ precision;
//     line.p1.y = p1.Y/ precision;
//     line.p1.z = zPosition;
//     p2 = polynode->Contour[1];
//     line.p2.x = p2.X / precision;
//     line.p2.y = p2.Y / precision;
//     line.p2.z = zPosition;
//     lines.push_back(line);
//     polynode = polynode->GetNext();
//   } 

//   for(uint32_t index =0; index < node->size(); index++ ){
//     poly2[index*2] = node->at(index).X;
//     poly2[index*2+1] = node->at(index).Y;
//   }


  return Napi::Buffer<int32_t>::New(env, poly2, tree->Total() * 2);
}