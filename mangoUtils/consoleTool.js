


const ConsoleTool = function (){
  this.count = {};
  this.value = {};
  this.onlyOnce = {};
  this.giveTrueOnce= {};
  this.stepStorage = {};
  this.totalStep= {};

  this.logCount = function (){
    console.log("----->>> START LOG COUNT <<<----")
    for(const key in this.count){
      console.log(`${key}: ${this.count[key]}`);
    }
    console.log("-----<<< END LOG COUNT >>>----")

  }

  this.logValue = function (){
    console.log("----->>> START LOG VALUE <<<----");
    for(const key in this.value){
      console.log(`${key}: ${this.value[key]}`);
    }
    console.log("-----<<< END LOG VALUE >>>----")
  }

  this.add = function (key){
    if(this.value[key]){
      this.count[key]++
    }else{
      this.count[key] = 1;
    }
  }

  this.logOnlyOnCount = function (key, count, logContent){
    if(this.value[key]){
      this.count[key]++
    }else{
      this.count[key] = 1;
    }
    if(this.count[key] == count){
      console.log(`${key} : `, logContent);
    }
  }

  this.storeOnce = function (key, value){
    if(!this.value[key]){
      this.value[key] = value;
    }
  }

  this.logOnce = function (key, value){
    if(!this.onlyOnce[key]){
      this.onlyOnce[key] = true;
      console.log(`${key}: `, value);
    }
  }

  this.log = function (key, value){
      console.log(`${key}: `, value);
  }

  this.conditionnalLog = function(condition , key , value){
    if(condition){
      console.log(`${key}: `, value);
    }
  }

  this.conditionnalLogOnce = function(condition , key , value){
    if(condition && !this.onlyOnce[key]){
      this.onlyOnce[key] = true;
      this.log(key, value);
    }
  }

  this.onlyTrueOnce = function (key){
    if(!this.giveTrueOnce[key]){
      this.giveTrueOnce[key] = true;
      return true;
    }
    return false;
  }

  this.timeStepStart = function (key){
    const start = Date.now();
    this.stepStorage[key] = Date.now();
  }

  this.timeStepEnd = function (key){
    if(this.stepStorage[key]){
      if(this.totalStep[key]){
        this.totalStep[key] += Date.now() - this.stepStorage[key];
      }else{
        this.totalStep[key] = Date.now() - this.stepStorage[key];
      }
    }
    
  }

  this.logAllTimeStep =function (){
    console.log("----->>> START TIME STEP LOG <<<----")
    for(const key in this.totalStep){
      console.log(`${key}: ${this.totalStep[key]} ms`);
    }
    console.log("-----<<< END TIME STEP LOG >>>----")
  }

  return this;
}();


module.exports = ConsoleTool;