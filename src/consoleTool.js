
(function() {
  if (self.consoleTool) return;

  const ConsoleTool = self.consoleTool = {
    count : {},
    value : {},
    onlyOnce : {},
    giveTrueOnce : {},
    stepStorage : {},
    totalStep : {},
  }

  ConsoleTool.logCount = function () {
    console.log("----->>> START LOG COUNT <<<----")
    for (const key in this.count) {
      console.log(`${key}: ${this.count[key]}`);
    }
    console.log("-----<<< END LOG COUNT >>>----")

  }

  ConsoleTool.logValue = function () {
    console.log("----->>> START LOG VALUE <<<----");
    for (const key in this.value) {
      console.log(`${key}: ${this.value[key]}`);
    }
    console.log("-----<<< END LOG VALUE >>>----")
  }

  ConsoleTool.add = function (key) {
    if (this.value[key]) {
      this.count[key]++
    } else {
      this.count[key] = 1;
    }
  }

  ConsoleTool.logOnlyOnCount = function (key, count, logContent) {
    if (this.value[key]) {
      this.count[key]++
    } else {
      this.count[key] = 1;
    }
    if (this.count[key] == count) {
      console.log(`${key} : `, logContent);
    }
  }

  ConsoleTool.storeOnce = function (key, value) {
    if (!this.value[key]) {
      this.value[key] = value;
    }
  }

  ConsoleTool.logOnce = function (key, value) {
    if (!this.onlyOnce[key]) {
      this.onlyOnce[key] = true;
      console.log(`${key}: `, value);
    }
  }

  ConsoleTool.log = function (key, value) {
    console.log(`${key}: `, value);
  }

  ConsoleTool.conditionnalLog = function (condition, key, value) {
    if (condition) {
      console.log(`${key}: `, value);
    }
  }

  ConsoleTool.conditionnalLogOnce = function (condition, key, value) {
    if (condition && !this.onlyOnce[key]) {
      this.onlyOnce[key] = true;
      this.log(key, value);
    }
  }

  ConsoleTool.onlyTrueOnce = function (key) {
    if (!this.giveTrueOnce[key]) {
      this.giveTrueOnce[key] = true;
      return true;
    }
    return false;
  }

  ConsoleTool.timeStepStart = function (key) {
    const start = Date.now();
    this.stepStorage[key] = Date.now();
  }

  ConsoleTool.timeStepEnd = function (key) {
    if (this.stepStorage[key]) {
      if (this.totalStep[key]) {
        this.totalStep[key] += Date.now() - this.stepStorage[key];
      } else {
        this.totalStep[key] = Date.now() - this.stepStorage[key];
      }
    }

  }

  ConsoleTool.logAllTimeStep = function () {
    console.log("----->>> START TIME STEP LOG <<<----")
    for (const key in this.totalStep) {
      console.log(`${key}: ${this.totalStep[key]} ms`);
    }
    console.log("-----<<< END TIME STEP LOG >>>----")
  }
})();
