#include "./ClipperOffsetToPolyTree.h"
#include "../vendors/utils/log.h"
#include "../vendors/utils/heapMutex.h"
#include "../vendors/utils/except.h"
#include "../vendors/utils/parallellFor.h"

#include <fstream>

#include "../lib/clipper.hpp"

#ifdef _WIN32
#include <Windows.h>
#include <string>
#endif

/**
 *  static javascript interface initializer
 */

ClipperLib::JoinType getJoinType2(uint8_t type){
    switch (type)
    {
    case 0 :
      return ClipperLib::JoinType::jtSquare;
    case 1 :
      return ClipperLib::JoinType::jtRound;
    case 2 :
      return ClipperLib::JoinType::jtMiter;
    default:
      return ClipperLib::JoinType::jtSquare;
    }
}

ClipperLib::EndType getEndType2(uint8_t type){
    switch (type)
    {
    case 0 :
      return ClipperLib::EndType::etOpenSquare;
    case 1 :
      return ClipperLib::EndType::etOpenRound;
    case 2 :
      return ClipperLib::EndType::etOpenButt;
    case 3 :
      return ClipperLib::EndType::etClosedLine;
    case 4 :
      return ClipperLib::EndType::etClosedPolygon;
    default :
      return ClipperLib::EndType::etClosedPolygon;
    }
}

ClipperLib::PolyFillType getFillType2(uint8_t type){
    switch (type)
    {
    case 0 :
      return ClipperLib::PolyFillType::pftEvenOdd;
    case 1 :
      return ClipperLib::PolyFillType::pftNonZero;
    case 2 :
      return ClipperLib::PolyFillType::pftPositive;
    case 3 :
      return ClipperLib::PolyFillType::pftNegative;
    default :
      return ClipperLib::PolyFillType::pftEvenOdd;
    }
}


Napi::Value ClipperOffsetToPolyTree::Init(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
  
  std::string checkResult = ParametersChecker(info, "ClipperOffsetToPolyTree", { napi_object, napi_number , napi_number, napi_boolean,napi_number, napi_boolean,napi_number, napi_number, napi_number});
  if (checkResult != "") {
    Napi::Object props = Napi::Object::New(env);
    props.Set("success", Napi::Boolean::New(env, false));
    props.Set("error", Napi::String::New(env, checkResult));
    return props;
  }

  Napi::Array polys = info[0].As<Napi::Array>();

  uint8_t joinTypeInt =  info[1].As<Napi::Number>().Uint32Value();
  uint8_t endTypeInt =  info[2].As<Napi::Number>().Uint32Value();
  bool clean = info[3].As<Napi::Boolean>().Value();
  double cleanDistance =  info[4].As<Napi::Number>().DoubleValue();
  bool simple = info[5].As<Napi::Boolean>().Value();
  uint8_t fillTypeInt =  info[6].As<Napi::Number>().Uint32Value();
  double offset =  info[7].As<Napi::Number>().DoubleValue();
  double precision =  info[8].As<Napi::Number>().FloatValue();
  
  
  ClipperOffsetToPolyTree *worker = new ClipperOffsetToPolyTree(&polys, joinTypeInt, endTypeInt, clean,cleanDistance, simple, fillTypeInt, offset, precision, Napi::Object::New(info.Env()));
  return worker->Execute(env);
}

/**
 *  Constructor
 */
ClipperOffsetToPolyTree::ClipperOffsetToPolyTree(Napi::Array *polys, uint8_t joinTypeInt,  uint8_t endTypeInt,bool clean,double cleanDistance, bool simple, uint8_t fillTypeInt, double offset, float precision, const Napi::Object &resource)
  : polys(polys), endTypeInt(endTypeInt), joinTypeInt(joinTypeInt), clean(clean), simple(simple), fillTypeInt(fillTypeInt), cleanDistance(cleanDistance), offset(offset), precision(precision)
  {
  }

  class SafeExecuteData
{
public:
  ClipperOffsetToPolyTree* m_obj;
  Napi::Env*        m_env;
};

void ClipperOffsetToPolyTree::SafeExecute(void* data)
{
  SafeExecuteData* executeData = static_cast<SafeExecuteData*>(data);
  executeData->m_obj->ExecuteFunction(*executeData->m_env);
}

Napi::Value ClipperOffsetToPolyTree::Execute(Napi::Env env) {
  // Console::log("ClipperOffsetToPolyTree ----->");

  SafeExecuteData executeData;
  executeData.m_obj = this;
  executeData.m_env = &env;
  // if (!safeExecuteFunc(SafeExecute, &executeData))
  //   return this->OnError(env);
  this->ExecuteFunction(env);

 //Console::timeEnd("Colision with rays");
 return this->OnOK(env);
}

void ClipperOffsetToPolyTree::ExecuteFunction(Napi::Env env) {
  uint32_t numberOfPoly =  polys->Length();

  ClipperLib::JoinType joinType = getJoinType2(joinTypeInt);
  ClipperLib::EndType endType = getEndType2(endTypeInt);
  
  for(uint32_t h = 0; h < numberOfPoly; h++){
    const Napi::Array paths = polys->Get(h).As<Napi::Array>();

    uint32_t lengthPath =  paths.Length();
    ClipperLib::Paths ins(lengthPath);

    Console::time("for");
    for(uint32_t i = 0; i < lengthPath; i++){
      Console::time("pointsArray");
      const Napi::Array pointsArray = paths.Get(i).As<Napi::Array>();
      uint32_t length =  pointsArray.Length();
      Console::timeStep("pointsArray");

      for(uint32_t j = 0; j < length; j ++){
        Console::time("forO");
        Napi::Object o = pointsArray[j].As<Napi::Object>();    
        Console::timeStep("forO");

        Console::time("forCast");
        int32_t x = o.Get("X").As<Napi::Number>().Int32Value();
        int32_t y = o.Get("Y").As<Napi::Number>().Int32Value();
        Console::timeStep("forCast");

        Console::time("forInsert");
        ins[i] << ClipperLib::IntPoint(x,y);
        Console::timeStep("forInsert");
      }
    }
    Console::timeStep("for");

    Console::time("clean");
    try{
      if(clean){
        ClipperLib::Paths cleans;
        ClipperLib::CleanPolygons(ins, cleans, cleanDistance);
        ins = cleans;
      }
    }catch(int e){
      Console::log("ClipperOffsetToPolyTree CleanPolygons error", e);
    }
    Console::timeStep("clean");
    
    Console::time("simple");
    try{
      if(simple){
        ClipperLib::Paths simples;
        ClipperLib::PolyFillType fillType = getFillType2(fillTypeInt);
        ClipperLib::SimplifyPolygons(ins, simples, fillType);
        ins = simples;      
      }
    }catch(int e){
      Console::log("ClipperOffsetToPolyTree SimplifyPolygons error", e);
    }
    Console::timeStep("simple");

    Console::time("AddPaths");
    co.AddPaths(ins, joinType, endType);
    Console::timeStep("AddPaths");
  }

  try{
    Console::time("Execute");
    co.Execute(resultPolyTree, offset);
    Console::timeStep("Execute");
  }catch(int e){
    // Console::log("ClipperOffsetToPolyTree Execute error", e);
  }  
}

Napi::Value ClipperOffsetToPolyTree::OnError(Napi::Env env) {
  Napi::HandleScope scope(env);

  // Console::log("<---- ClipperOffsetToPolyTree error");

  // reject promise with error value
  // Call empty function
  Napi::Object props = Napi::Object::New(env);
  
  props.Set("success", Napi::Boolean::New(env, false));
  props.Set("error", Napi::String::New(env, "AddPaths error "));

  co.Clear();

  return props;
}

Napi::Object ClipperOffsetToPolyTree::ExportPolyNode(ClipperLib::PolyNode *node, Napi::Env env){
  Napi::Object polyNode = Napi::Object::New(env);
  Napi::Array polygon = Napi::Array::New(env, node->Contour.size());
  for(uint32_t index =0; index < node->Contour.size(); index++ ){
    Napi::Object point = Napi::Object::New(env);
    point.Set("X", node->Contour[index].X);
    point.Set("Y", node->Contour[index].Y);
    polygon.Set(index, point);
  }
  polyNode.Set("m_polygon", polygon);
  polyNode.Set("IsHole", Napi::Boolean::New(env, node->IsHole()));
  polyNode.Set("IsOpen", Napi::Boolean::New(env, node->IsOpen()));
  //polyNode.Set("ChildCount", node->ChildCount());
  
  Napi::Array childrenJS = Napi::Array::New(env, node->ChildCount());
  for(uint64_t index = 0; index < node->ChildCount(); index++){
    ClipperLib::PolyNode * nextNode = node->Childs[index];
    Napi::Object childJS = ExportPolyNode(nextNode, env);
    childrenJS.Set(index, childJS);
  }
  //Console::logOnce("<---- ExportPolyTree", node->Contour.size());
  polyNode.Set("m_Childs", childrenJS);
  return polyNode;
}

Napi::Value ClipperOffsetToPolyTree::OnOK(Napi::Env env) {
  // Console::log("<---- ClipperOffsetToPolyTree");

  // Console::time("exportToView");
 
  Napi::HandleScope scope(env);
  Napi::Object props = Napi::Object::New(env);

  props.Set("success", Napi::Boolean::New(env, true));

  Console::time("PolyTree");
  Napi::Object polyTree = Napi::Object::New(env);
  Napi::Array childrenJS = Napi::Array::New(env, resultPolyTree.Childs.size());
  for(uint64_t index = 0; index < resultPolyTree.Childs.size(); index++){
    ClipperLib::PolyNode * node = resultPolyTree.Childs[index];
    Napi::Object childJS = ExportPolyNode(node, env);
    childrenJS.Set(index, childJS);
  }

  Napi::Array polygon = Napi::Array::New(env, resultPolyTree.Contour.size());
  for(uint32_t index =0; index < resultPolyTree.Contour.size(); index++ ){
    Napi::Object point = Napi::Object::New(env);
    point.Set("X", resultPolyTree.Contour[index].X);
    point.Set("Y", resultPolyTree.Contour[index].Y);
    polygon.Set(index, point);
  }
  polyTree.Set("m_AllPolys", polygon);
  polyTree.Set("m_Childs",childrenJS);
  //polyTree.Set("IsHole", Napi::Boolean::New(env, resultPolyTree.IsHole()));
  polyTree.Set("IsOpen", Napi::Boolean::New(env, resultPolyTree.IsOpen()));  
  //polyTree.Set("ChildCount", resultPolyTree.ChildCount());
  //polyTree.Set("m_endtype", resultPolyTree.m_endtype);
  //polyTree.Set("m_jointype", resultPolyTree.m_jointype);

  props.Set("polytree", polyTree);
  Console::timeStep("PolyTree");

  co.Clear();

  return props;
}