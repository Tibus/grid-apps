#ifndef Point3D_H
#define Point3D_H

struct Point3D {
  float x = 0;
  float y = 0;
  float z = 0;
};

struct Line{
  Point3D p1;
  Point3D p2;
  float od;  
};




#endif