var Module = (() => {
  var _scriptDir = import.meta.url;
  return function(Module2) {
    Module2 = Module2 || {};
    var Module2 = typeof Module2 != "undefined" ? Module2 : {};
    var readyPromiseResolve, readyPromiseReject;
    Module2["ready"] = new Promise(function(resolve, reject) {
      readyPromiseResolve = resolve;
      readyPromiseReject = reject;
    });
    ["_malloc", "_meshopt_simplifyWithAttributes", "_meshopt_simplifySloppy", "_meshopt_generateShadowIndexBuffer", "_fflush", "onRuntimeInitialized"].forEach((prop) => {
      if (!Object.getOwnPropertyDescriptor(Module2["ready"], prop)) {
        Object.defineProperty(Module2["ready"], prop, { get: () => abort("You are getting " + prop + " on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js"), set: () => abort("You are setting " + prop + " on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js") });
      }
    });
    var moduleOverrides = Object.assign({}, Module2);
    var ENVIRONMENT_IS_WEB = typeof window == "object";
    var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";
    var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";
    var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
    if (Module2["ENVIRONMENT"]) {
      throw new Error("Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)");
    }
    var scriptDirectory = "";
    function locateFile(path) {
      if (Module2["locateFile"]) {
        return Module2["locateFile"](path, scriptDirectory);
      }
      return scriptDirectory + path;
    }
    var read_, readBinary;
    if (ENVIRONMENT_IS_NODE) {
      if (typeof process == "undefined" || !process.release || process.release.name !== "node") throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
      if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = require("path").dirname(scriptDirectory) + "/";
      } else {
        scriptDirectory = __dirname + "/";
      }
      var fs;
      var nodePath;
      var requireNodeFS = () => {
        if (!nodePath) {
          fs = require("fs");
          nodePath = require("path");
        }
      };
      read_ = (filename, binary) => {
        var ret = tryParseAsDataURI(filename);
        if (ret) {
          return binary ? ret : ret.toString();
        }
        requireNodeFS();
        filename = nodePath["normalize"](filename);
        return fs.readFileSync(filename, binary ? void 0 : "utf8");
      };
      readBinary = (filename) => {
        var ret = read_(filename, true);
        if (!ret.buffer) {
          ret = new Uint8Array(ret);
        }
        assert(ret.buffer);
        return ret;
      };
      if (process["argv"].length > 1) {
        process["argv"][1].replace(/\\/g, "/");
      }
      process["argv"].slice(2);
      process["on"]("uncaughtException", function(ex) {
        if (!(ex instanceof ExitStatus)) {
          throw ex;
        }
      });
      process["on"]("unhandledRejection", function(reason) {
        throw reason;
      });
      Module2["inspect"] = function() {
        return "[Emscripten Module object]";
      };
    } else if (ENVIRONMENT_IS_SHELL) {
      if (typeof process == "object" && typeof require === "function" || typeof window == "object" || typeof importScripts == "function") throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
      if (typeof read != "undefined") {
        read_ = function shell_read(f) {
          const data = tryParseAsDataURI(f);
          if (data) {
            return intArrayToString(data);
          }
          return read(f);
        };
      }
      readBinary = function readBinary2(f) {
        let data;
        data = tryParseAsDataURI(f);
        if (data) {
          return data;
        }
        if (typeof readbuffer == "function") {
          return new Uint8Array(readbuffer(f));
        }
        data = read(f, "binary");
        assert(typeof data == "object");
        return data;
      };
      if (typeof scriptArgs != "undefined") {
        scriptArgs;
      }
      if (typeof print != "undefined") {
        if (typeof console == "undefined") console = {};
        console.log = print;
        console.warn = console.error = typeof printErr != "undefined" ? printErr : print;
      }
    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href;
      } else if (typeof document != "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src;
      }
      if (_scriptDir) {
        scriptDirectory = _scriptDir;
      }
      if (scriptDirectory.indexOf("blob:") !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
      } else {
        scriptDirectory = "";
      }
      if (!(typeof window == "object" || typeof importScripts == "function")) throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
      {
        read_ = (url) => {
          try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            xhr.send(null);
            return xhr.responseText;
          } catch (err2) {
            var data = tryParseAsDataURI(url);
            if (data) {
              return intArrayToString(data);
            }
            throw err2;
          }
        };
        if (ENVIRONMENT_IS_WORKER) {
          readBinary = (url) => {
            try {
              var xhr = new XMLHttpRequest();
              xhr.open("GET", url, false);
              xhr.responseType = "arraybuffer";
              xhr.send(null);
              return new Uint8Array(xhr.response);
            } catch (err2) {
              var data = tryParseAsDataURI(url);
              if (data) {
                return data;
              }
              throw err2;
            }
          };
        }
      }
    } else {
      throw new Error("environment detection error");
    }
    Module2["print"] || console.log.bind(console);
    var err = Module2["printErr"] || console.warn.bind(console);
    Object.assign(Module2, moduleOverrides);
    moduleOverrides = null;
    checkIncomingModuleAPI();
    if (Module2["arguments"]) Module2["arguments"];
    legacyModuleProp("arguments", "arguments_");
    if (Module2["thisProgram"]) Module2["thisProgram"];
    legacyModuleProp("thisProgram", "thisProgram");
    if (Module2["quit"]) Module2["quit"];
    legacyModuleProp("quit", "quit_");
    assert(typeof Module2["memoryInitializerPrefixURL"] == "undefined", "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");
    assert(typeof Module2["pthreadMainPrefixURL"] == "undefined", "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");
    assert(typeof Module2["cdInitializerPrefixURL"] == "undefined", "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");
    assert(typeof Module2["filePackagePrefixURL"] == "undefined", "Module.filePackagePrefixURL option was removed, use Module.locateFile instead");
    assert(typeof Module2["read"] == "undefined", "Module.read option was removed (modify read_ in JS)");
    assert(typeof Module2["readAsync"] == "undefined", "Module.readAsync option was removed (modify readAsync in JS)");
    assert(typeof Module2["readBinary"] == "undefined", "Module.readBinary option was removed (modify readBinary in JS)");
    assert(typeof Module2["setWindowTitle"] == "undefined", "Module.setWindowTitle option was removed (modify setWindowTitle in JS)");
    assert(typeof Module2["TOTAL_MEMORY"] == "undefined", "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY");
    legacyModuleProp("read", "read_");
    legacyModuleProp("readAsync", "readAsync");
    legacyModuleProp("readBinary", "readBinary");
    legacyModuleProp("setWindowTitle", "setWindowTitle");
    assert(!ENVIRONMENT_IS_WORKER, "worker environment detected but not enabled at build time.  Add 'worker' to `-sENVIRONMENT` to enable.");
    assert(!ENVIRONMENT_IS_SHELL, "shell environment detected but not enabled at build time.  Add 'shell' to `-sENVIRONMENT` to enable.");
    function legacyModuleProp(prop, newName) {
      if (!Object.getOwnPropertyDescriptor(Module2, prop)) {
        Object.defineProperty(Module2, prop, { configurable: true, get: function() {
          abort("Module." + prop + " has been replaced with plain " + newName + " (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)");
        } });
      }
    }
    function ignoredModuleProp(prop) {
      if (Object.getOwnPropertyDescriptor(Module2, prop)) {
        abort("`Module." + prop + "` was supplied but `" + prop + "` not included in INCOMING_MODULE_JS_API");
      }
    }
    function isExportedByForceFilesystem(name) {
      return name === "FS_createPath" || name === "FS_createDataFile" || name === "FS_createPreloadedFile" || name === "FS_unlink" || name === "addRunDependency" || name === "FS_createLazyFile" || name === "FS_createDevice" || name === "removeRunDependency";
    }
    function missingLibrarySymbol(sym) {
      if (typeof globalThis !== "undefined" && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
        Object.defineProperty(globalThis, sym, { configurable: true, get: function() {
          var msg = "`" + sym + "` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line";
          if (isExportedByForceFilesystem(sym)) {
            msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
          }
          warnOnce(msg);
          return void 0;
        } });
      }
    }
    function unexportedRuntimeSymbol(sym) {
      if (!Object.getOwnPropertyDescriptor(Module2, sym)) {
        Object.defineProperty(Module2, sym, { configurable: true, get: function() {
          var msg = "'" + sym + "' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)";
          if (isExportedByForceFilesystem(sym)) {
            msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
          }
          abort(msg);
        } });
      }
    }
    var wasmBinary;
    if (Module2["wasmBinary"]) wasmBinary = Module2["wasmBinary"];
    legacyModuleProp("wasmBinary", "wasmBinary");
    Module2["noExitRuntime"] || true;
    legacyModuleProp("noExitRuntime", "noExitRuntime");
    if (typeof WebAssembly != "object") {
      abort("no native wasm support detected");
    }
    var wasmMemory;
    var ABORT = false;
    function assert(condition, text) {
      if (!condition) {
        abort("Assertion failed" + (text ? ": " + text : ""));
      }
    }
    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : void 0;
    function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = "";
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          if ((u0 & 248) != 240) warnOnce("Invalid UTF-8 leading byte 0x" + u0.toString(16) + " encountered when deserializing a UTF-8 string in wasm memory to a JS string!");
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    }
    function UTF8ToString(ptr, maxBytesToRead) {
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
    }
    function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
          var u1 = str.charCodeAt(++i);
          u = 65536 + ((u & 1023) << 10) | u1 & 1023;
        }
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          if (u > 1114111) warnOnce("Invalid Unicode code point 0x" + u.toString(16) + " encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).");
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    }
    function stringToUTF8(str, outPtr, maxBytesToWrite) {
      assert(typeof maxBytesToWrite == "number", "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    }
    var buffer, HEAP8, HEAPU8, HEAPU32;
    function updateGlobalBufferAndViews(buf) {
      buffer = buf;
      Module2["HEAP8"] = HEAP8 = new Int8Array(buf);
      Module2["HEAP16"] = new Int16Array(buf);
      Module2["HEAP32"] = new Int32Array(buf);
      Module2["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
      Module2["HEAPU16"] = new Uint16Array(buf);
      Module2["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
      Module2["HEAPF32"] = new Float32Array(buf);
      Module2["HEAPF64"] = new Float64Array(buf);
    }
    var TOTAL_STACK = 5242880;
    if (Module2["TOTAL_STACK"]) assert(TOTAL_STACK === Module2["TOTAL_STACK"], "the stack size can no longer be determined at runtime");
    var INITIAL_MEMORY = Module2["INITIAL_MEMORY"] || 16777216;
    legacyModuleProp("INITIAL_MEMORY", "INITIAL_MEMORY");
    assert(INITIAL_MEMORY >= TOTAL_STACK, "INITIAL_MEMORY should be larger than TOTAL_STACK, was " + INITIAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")");
    assert(typeof Int32Array != "undefined" && typeof Float64Array !== "undefined" && Int32Array.prototype.subarray != void 0 && Int32Array.prototype.set != void 0, "JS engine does not provide full typed array support");
    assert(!Module2["wasmMemory"], "Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally");
    assert(INITIAL_MEMORY == 16777216, "Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically");
    var wasmTable;
    function writeStackCookie() {
      var max = _emscripten_stack_get_end();
      assert((max & 3) == 0);
      HEAPU32[max >> 2] = 34821223;
      HEAPU32[max + 4 >> 2] = 2310721022;
      HEAPU32[0] = 1668509029;
    }
    function checkStackCookie() {
      if (ABORT) return;
      var max = _emscripten_stack_get_end();
      var cookie1 = HEAPU32[max >> 2];
      var cookie2 = HEAPU32[max + 4 >> 2];
      if (cookie1 != 34821223 || cookie2 != 2310721022) {
        abort("Stack overflow! Stack cookie has been overwritten at 0x" + max.toString(16) + ", expected hex dwords 0x89BACDFE and 0x2135467, but received 0x" + cookie2.toString(16) + " 0x" + cookie1.toString(16));
      }
      if (HEAPU32[0] !== 1668509029) abort("Runtime error: The application has corrupted its heap memory area (address zero)!");
    }
    (function() {
      var h16 = new Int16Array(1);
      var h8 = new Int8Array(h16.buffer);
      h16[0] = 25459;
      if (h8[0] !== 115 || h8[1] !== 99) throw "Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)";
    })();
    var __ATPRERUN__ = [];
    var __ATINIT__ = [];
    var __ATPOSTRUN__ = [];
    var runtimeInitialized = false;
    function preRun() {
      if (Module2["preRun"]) {
        if (typeof Module2["preRun"] == "function") Module2["preRun"] = [Module2["preRun"]];
        while (Module2["preRun"].length) {
          addOnPreRun(Module2["preRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPRERUN__);
    }
    function initRuntime() {
      assert(!runtimeInitialized);
      runtimeInitialized = true;
      checkStackCookie();
      callRuntimeCallbacks(__ATINIT__);
    }
    function postRun() {
      checkStackCookie();
      if (Module2["postRun"]) {
        if (typeof Module2["postRun"] == "function") Module2["postRun"] = [Module2["postRun"]];
        while (Module2["postRun"].length) {
          addOnPostRun(Module2["postRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPOSTRUN__);
    }
    function addOnPreRun(cb) {
      __ATPRERUN__.unshift(cb);
    }
    function addOnInit(cb) {
      __ATINIT__.unshift(cb);
    }
    function addOnPostRun(cb) {
      __ATPOSTRUN__.unshift(cb);
    }
    assert(Math.imul, "This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
    assert(Math.fround, "This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
    assert(Math.clz32, "This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
    assert(Math.trunc, "This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
    var runDependencies = 0;
    var runDependencyWatcher = null;
    var dependenciesFulfilled = null;
    var runDependencyTracking = {};
    function addRunDependency(id) {
      runDependencies++;
      if (Module2["monitorRunDependencies"]) {
        Module2["monitorRunDependencies"](runDependencies);
      }
      {
        assert(!runDependencyTracking[id]);
        runDependencyTracking[id] = 1;
        if (runDependencyWatcher === null && typeof setInterval != "undefined") {
          runDependencyWatcher = setInterval(function() {
            if (ABORT) {
              clearInterval(runDependencyWatcher);
              runDependencyWatcher = null;
              return;
            }
            var shown = false;
            for (var dep in runDependencyTracking) {
              if (!shown) {
                shown = true;
                err("still waiting on run dependencies:");
              }
              err("dependency: " + dep);
            }
            if (shown) {
              err("(end of list)");
            }
          }, 1e4);
        }
      }
    }
    function removeRunDependency(id) {
      runDependencies--;
      if (Module2["monitorRunDependencies"]) {
        Module2["monitorRunDependencies"](runDependencies);
      }
      {
        assert(runDependencyTracking[id]);
        delete runDependencyTracking[id];
      }
      if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    function abort(what) {
      {
        if (Module2["onAbort"]) {
          Module2["onAbort"](what);
        }
      }
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject(e);
      throw e;
    }
    var FS = { error: function() {
      abort("Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with -sFORCE_FILESYSTEM");
    }, init: function() {
      FS.error();
    }, createDataFile: function() {
      FS.error();
    }, createPreloadedFile: function() {
      FS.error();
    }, createLazyFile: function() {
      FS.error();
    }, open: function() {
      FS.error();
    }, mkdev: function() {
      FS.error();
    }, registerDevice: function() {
      FS.error();
    }, analyzePath: function() {
      FS.error();
    }, loadFilesFromDB: function() {
      FS.error();
    }, ErrnoError: function ErrnoError() {
      FS.error();
    } };
    Module2["FS_createDataFile"] = FS.createDataFile;
    Module2["FS_createPreloadedFile"] = FS.createPreloadedFile;
    var dataURIPrefix = "data:application/octet-stream;base64,";
    function isDataURI(filename) {
      return filename.startsWith(dataURIPrefix);
    }
    function isFileURI(filename) {
      return filename.startsWith("file://");
    }
    function createExportWrapper(name, fixedasm) {
      return function() {
        var displayName = name;
        var asm2 = fixedasm;
        {
          asm2 = Module2["asm"];
        }
        assert(runtimeInitialized, "native function `" + displayName + "` called before runtime initialization");
        if (!asm2[name]) {
          assert(asm2[name], "exported native function `" + displayName + "` not found");
        }
        return asm2[name].apply(null, arguments);
      };
    }
    var wasmBinaryFile;
    wasmBinaryFile = "data:application/octet-stream;base64,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LWogATYCACACQQFqIgIgKUcNAAtBACEBQQAhACApQQFrIixBB08EQCApQXhxIQNBACEGA0AgMiAAQQJ0aiAANgIAIDIgAEEBciICQQJ0aiACNgIAIDIgAEECciICQQJ0aiACNgIAIDIgAEEDciICQQJ0aiACNgIAIDIgAEEEciICQQJ0aiACNgIAIDIgAEEFciICQQJ0aiACNgIAIDIgAEEGciICQQJ0aiACNgIAIDIgAEEHciICQQJ0aiACNgIAIABBCGohACAGQQhqIgYgA0cNAAsLIClBB3EiAgRAA0AgMiAAQQJ0aiAANgIAIABBAWohACABQQFqIgEgAkcNAAsLIClBAXEhPwJAICxFBEBBACEADAELIClBfnEhA0EAIQBBACEGA0AgACAtIABBAnQiAmooAgAiAUcEQCACIDJqIDIgAUECdGoiASgCADYCACABIAA2AgALIC0gAEEBciIsQQJ0IgJqKAIAIgEgLEcEQCACIDJqIDIgAUECdGoiASgCADYCACABICw2AgALIABBAmohACAGQQJqIgYgA0cNAAsLID9FDQAgLSAAQQJ0IgJqKAIAIgEgAEYNACACIDJqIDIgAUECdGoiASgCADYCACABIAA2AgALID5BjBQoAgARAQAgMSApQZAUKAIAEQAAIjA2AgAgKkEIaiA7QQVyQQJ0aiBFQZAUKAIAEQAAIgA2AgAgRUGQFCgCABEAACEBICogO0EHaiI+NgJoIDtBAnQgKmogATYCICAAQf8BIEwQCyE3IAFB/wEgTBALITkgKUUNCwNAIEQgBCIBQQFqIgRBAnRqKAIAIgAgRCABQQJ0IgNqKAIAIgJHBEAgACACayExIEYgAkEDdGohLCADIDlqIT8gAyA3aiFHQQAhBgNAAkAgASAsIAZBA3RqKAIAIjxGBEAgRyABNgIAID8gATYCAAwBCwJAIEQgPEECdCIDaiICKAIEIgAgAigCACI4Rg0AIEYgOEEDdGoiAigCACABRg0BIAAgOGshOEEAIQADQCAAQQFqIgAgOEYNASACIABBA3RqKAIAIAFHDQALIAAgOEkNAQsgAyA5aiIAIAEgPCAAKAIAQX9GGzYCACBHIDwgASBHKAIAQX9GGzYCAAsgBkEBaiIGIDFHDQALCyAEIClHDQALQQAhAANAAkACQCAAIC0gAEECdCICaigCACIB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FDYCFCACIAEoAhg2AhggAiABKAIcNgIcIAIgASgCIDYCICACIAEoAiQ2AiQgAiABKAIoNgIoIAIgASgCLDYCLCACIAEoAjA2AjAgAiABKAI0NgI0IAIgASgCODYCOCACIAEoAjw2AjwgAUFAayEBIAJBQGsiAiAETQ0ACwsgACACTQ0BA0AgAiABKAIANgIAIAFBBGohASACQQRqIgIgAEkNAAsMAQsgA0EESQRAIAAhAgwBCyAAIANBBGsiBEsEQCAAIQIMAQsgACECA0AgAiABLQAAOgAAIAIgAS0AAToAASACIAEtAAI6AAIgAiABLQADOgADIAFBBGohASACQQRqIgIgBE0NAAsLIAIgA0kEQANAIAIgAS0AADoAACABQQFqIQEgAkEBaiICIANHDQALCwvyAgICfwF+AkAgAkUNACAAIAE6AAAgACACaiIDQQFrIAE6AAAgAkEDSQ0AIAAgAToAAiAAIAE6AAEgA0EDayABOgAAIANBAmsgAToAACACQQdJDQAgACABOgADIANBBGsgAToAACACQQlJDQAgAEEAIABrQQNxIgRqIgMgAUH/AXFBgYKECGwiATYCACADIAIgBGtBfHEiBGoiAkEEayABNgIAIARBCUkNACADIAE2AgggAyABNgIEIAJBCGsgATYCACACQQxrIAE2AgAgBEEZSQ0AIAMgATYCGCADIAE2AhQgAyABNgIQIAMgATYCDCACQRBrIAE2AgAgAkEUayABNgIAIAJBGGsgATYCACACQRxrIAE2AgAgBCADQQRxQRhyIgRrIgJBIEkNACABrUKBgICAEH4hBSADIARqIQEDQCABIAU3AxggASAFNwMQIAEgBTcDCCABIAU3AwAgAUEgaiEBIAJBIGsiAkEfSw0ACwsgAAuBAQECfwJAAkAgAkEETwRAIAAgAXJBA3ENAQNAIAAoAgAgASgCAEcNAiABQQRqIQEgAEEEaiEAIAJBBGsiAkEDSw0ACwsgAkUNAQsDQCAALQAAIgMgAS0AACIERgRAIAFBAWohASAAQQFqIQAgAkEBayICDQEMAgsLIAMgBGsPC0EACwUAQaQUC08BAn9BlBQoAgAiASAAQQdqQXhxIgJqIQACQCACQQAgACABTRsNACAAPwBBEHRLBEAgABADRQ0BC0GUFCAANgIAIAEPC0GkFEEwNgIAQX8L8iwB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bmRpY2VzAGNvbXB1dGVWZXJ0ZXhJZHMAbWVzaG9wdF9nZW5lcmF0ZVNoYWRvd0luZGV4QnVmZmVyAHJlbWFwSW5kZXhCdWZmZXIAaGFzaExvb2t1cAAuL3NyYy9pbmRleGdlbmVyYXRvci5jcHAALi9zcmMvc2ltcGxpZmllci5jcHAAYnVpbGRTcGFyc2VSZW1hcAByZW1hcFtpXSA8IGkALi9zcmMvbWVzaG9wdGltaXplci5oAG9mZnNldCA9PSB1bmlxdWUAYWxsb2NhdGUAbWVzaG9wdF9zaW1wbGlmeUVkZ2UAdmVydGV4X3NpemUgPD0gdmVydGV4X3N0cmlkZQB2ZXJ0ZXhfc2l6ZSA+IDAgJiYgdmVydGV4X3NpemUgPD0gMjU2AHZlcnRleF9wb3NpdGlvbnNfc3RyaWRlID49IDEyICYmIHZlcnRleF9wb3NpdGlvbnNfc3RyaWRlIDw9IDI1NgB2ZXJ0ZXhfYXR0cmlidXRlc19zdHJpZGUgPj0gYXR0cmlidXRlX2NvdW50ICogc2l6ZW9mKGZsb2F0KSAmJiB2ZXJ0ZXhfYXR0cmlidXRlc19zdHJpZGUgPD0gMjU2AGdyaWRfc2l6ZSA+PSAxICYmIGdyaWRfc2l6ZSA8PSAxMDI0AGNvbGxhcHNlX3JlbWFwW3YyXSA9PSB2MgBoYXNoTG9va3VwMgBjb2xsYXBzZV9yZW1hcFt2MV0gPT0gdjEAd2VkZ2VbczBdID09IGkwICYmIHdlZGdlW3MxXSA9PSBpMQBjb2xsYXBzZV9yZW1hcFtpMV0gPT0gaTEAczAgIT0gaTAgJiYgczEgIT0gaTEAY29sbGFwc2VfcmVtYXBbdjBdID09IHYwAGNvbGxhcHNlX3JlbWFwW2kwXSA9PSBpMAB3ZWRnZVtpMF0gPT0gaTAAYnVja2V0cyA+IDAAaW5kZXhfY291bnQgJSAzID09IDAAdmVydGV4X3Bvc2l0aW9uc19zdHJpZGUgJSBzaXplb2YoZmxvYXQpID09IDAAdmVydGV4X2F0dHJpYnV0ZXNfc3RyaWRlICUgc2l6ZW9mKGZsb2F0KSA9PSAwAChvcHRpb25zICYgfihtZXNob3B0X1NpbXBsaWZ5TG9ja0JvcmRlciB8IG1lc2hvcHRfU2ltcGxpZnlTcGFyc2UgfCBtZXNob3B0X1NpbXBsaWZ5RXJyb3JBYnNvbHV0ZSkpID09IDAAKGJ1Y2tldHMgJiAoYnVja2V0cyAtIDEpKSA9PSAwAGNvdW50IDwgc2l6ZW9mKGJsb2NrcykgLyBzaXplb2YoYmxvY2tzWzBdKQBmYWxzZSAmJiAiSGFzaCB0YWJsZSBpcyBmdWxsIgAAAAABAAAAAgAAAAAAAAABAAAAAQEBAAEBAAEAAAEBAQABAAAAAAABAAEAQfATCxQBAQEBAQABAAAAAAABAAAAAAABAQBBjBQLCwEAAAACAAAAMAxQ";
    if (!isDataURI(wasmBinaryFile)) {
      wasmBinaryFile = locateFile(wasmBinaryFile);
    }
    function getBinary(file) {
      try {
        if (file == wasmBinaryFile && wasmBinary) {
          return new Uint8Array(wasmBinary);
        }
        var binary = tryParseAsDataURI(file);
        if (binary) {
          return binary;
        }
        if (readBinary) {
          return readBinary(file);
        }
        throw "both async and sync fetching of the wasm failed";
      } catch (err2) {
        abort(err2);
      }
    }
    function getBinaryPromise() {
      if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
        if (typeof fetch == "function") {
          return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function(response) {
            if (!response["ok"]) {
              throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
            }
            return response["arrayBuffer"]();
          }).catch(function() {
            return getBinary(wasmBinaryFile);
          });
        }
      }
      return Promise.resolve().then(function() {
        return getBinary(wasmBinaryFile);
      });
    }
    function createWasm() {
      var info = { "env": asmLibraryArg, "wasi_snapshot_preview1": asmLibraryArg };
      function receiveInstance(instance, module) {
        var exports2 = instance.exports;
        Module2["asm"] = exports2;
        wasmMemory = Module2["asm"]["memory"];
        assert(wasmMemory, "memory not found in wasm exports");
        updateGlobalBufferAndViews(wasmMemory.buffer);
        wasmTable = Module2["asm"]["__indirect_function_table"];
        assert(wasmTable, "table not found in wasm exports");
        addOnInit(Module2["asm"]["__wasm_call_ctors"]);
        removeRunDependency("wasm-instantiate");
      }
      addRunDependency("wasm-instantiate");
      var trueModule = Module2;
      function receiveInstantiationResult(result) {
        assert(Module2 === trueModule, "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");
        trueModule = null;
        receiveInstance(result["instance"]);
      }
      function instantiateArrayBuffer(receiver) {
        return getBinaryPromise().then(function(binary) {
          return WebAssembly.instantiate(binary, info);
        }).then(function(instance) {
          return instance;
        }).then(receiver, function(reason) {
          err("failed to asynchronously prepare wasm: " + reason);
          if (isFileURI(wasmBinaryFile)) {
            err("warning: Loading from a file URI (" + wasmBinaryFile + ") is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing");
          }
          abort(reason);
        });
      }
      function instantiateAsync() {
        if (!wasmBinary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(wasmBinaryFile) && !ENVIRONMENT_IS_NODE && typeof fetch == "function") {
          return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function(response) {
            var result = WebAssembly.instantiateStreaming(response, info);
            return result.then(receiveInstantiationResult, function(reason) {
              err("wasm streaming compile failed: " + reason);
              err("falling back to ArrayBuffer instantiation");
              return instantiateArrayBuffer(receiveInstantiationResult);
            });
          });
        } else {
          return instantiateArrayBuffer(receiveInstantiationResult);
        }
      }
      if (Module2["instantiateWasm"]) {
        try {
          var exports = Module2["instantiateWasm"](info, receiveInstance);
          return exports;
        } catch (e) {
          err("Module.instantiateWasm callback failed with error: " + e);
          readyPromiseReject(e);
        }
      }
      instantiateAsync().catch(readyPromiseReject);
      return {};
    }
    function ExitStatus(status) {
      this.name = "ExitStatus";
      this.message = "Program terminated with exit(" + status + ")";
      this.status = status;
    }
    function callRuntimeCallbacks(callbacks) {
      while (callbacks.length > 0) {
        callbacks.shift()(Module2);
      }
    }
    function intArrayToString(array) {
      var ret = [];
      for (var i = 0; i < array.length; i++) {
        var chr = array[i];
        if (chr > 255) {
          {
            assert(false, "Character code " + chr + " (" + String.fromCharCode(chr) + ")  at offset " + i + " not in 0x00-0xFF.");
          }
          chr &= 255;
        }
        ret.push(String.fromCharCode(chr));
      }
      return ret.join("");
    }
    function warnOnce(text) {
      if (!warnOnce.shown) warnOnce.shown = {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        if (ENVIRONMENT_IS_NODE) text = "warning: " + text;
        err(text);
      }
    }
    function writeArrayToMemory(array, buffer2) {
      assert(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
      HEAP8.set(array, buffer2);
    }
    function ___assert_fail(condition, filename, line, func) {
      abort("Assertion failed: " + UTF8ToString(condition) + ", at: " + [filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function"]);
    }
    function _abort() {
      abort("native code called abort()");
    }
    function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.copyWithin(dest, src, src + num);
    }
    function getHeapMax() {
      return 2147483648;
    }
    function emscripten_realloc_buffer(size) {
      try {
        wasmMemory.grow(size - buffer.byteLength + 65535 >>> 16);
        updateGlobalBufferAndViews(wasmMemory.buffer);
        return 1;
      } catch (e) {
        err("emscripten_realloc_buffer: Attempted to grow heap from " + buffer.byteLength + " bytes to " + size + " bytes, but got error: " + e);
      }
    }
    function _emscripten_resize_heap(requestedSize) {
      var oldSize = HEAPU8.length;
      requestedSize = requestedSize >>> 0;
      assert(requestedSize > oldSize);
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        err("Cannot enlarge memory, asked to go up to " + requestedSize + " bytes, but the limit is " + maxHeapSize + " bytes!");
        return false;
      }
      let alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = emscripten_realloc_buffer(newSize);
        if (replacement) {
          return true;
        }
      }
      err("Failed to grow the heap from " + oldSize + " bytes to " + newSize + " bytes, not enough memory!");
      return false;
    }
    function getCFunc(ident) {
      var func = Module2["_" + ident];
      assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
      return func;
    }
    function ccall(ident, returnType, argTypes, args, opts) {
      var toC = { "string": (str) => {
        var ret2 = 0;
        if (str !== null && str !== void 0 && str !== 0) {
          var len = (str.length << 2) + 1;
          ret2 = stackAlloc(len);
          stringToUTF8(str, ret2, len);
        }
        return ret2;
      }, "array": (arr) => {
        var ret2 = stackAlloc(arr.length);
        writeArrayToMemory(arr, ret2);
        return ret2;
      } };
      function convertReturnValue(ret2) {
        if (returnType === "string") {
          return UTF8ToString(ret2);
        }
        if (returnType === "boolean") return Boolean(ret2);
        return ret2;
      }
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert(returnType !== "array", 'Return type should not be "array".');
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func.apply(null, cArgs);
      function onDone(ret2) {
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret2);
      }
      ret = onDone(ret);
      return ret;
    }
    function cwrap(ident, returnType, argTypes, opts) {
      return function() {
        return ccall(ident, returnType, argTypes, arguments);
      };
    }
    var decodeBase64 = typeof atob == "function" ? atob : function(input) {
      var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      var output = "";
      var chr1, chr2, chr3;
      var enc1, enc2, enc3, enc4;
      var i = 0;
      input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
      do {
        enc1 = keyStr.indexOf(input.charAt(i++));
        enc2 = keyStr.indexOf(input.charAt(i++));
        enc3 = keyStr.indexOf(input.charAt(i++));
        enc4 = keyStr.indexOf(input.charAt(i++));
        chr1 = enc1 << 2 | enc2 >> 4;
        chr2 = (enc2 & 15) << 4 | enc3 >> 2;
        chr3 = (enc3 & 3) << 6 | enc4;
        output = output + String.fromCharCode(chr1);
        if (enc3 !== 64) {
          output = output + String.fromCharCode(chr2);
        }
        if (enc4 !== 64) {
          output = output + String.fromCharCode(chr3);
        }
      } while (i < input.length);
      return output;
    };
    function intArrayFromBase64(s) {
      if (typeof ENVIRONMENT_IS_NODE == "boolean" && ENVIRONMENT_IS_NODE) {
        var buf = Buffer.from(s, "base64");
        return new Uint8Array(buf["buffer"], buf["byteOffset"], buf["byteLength"]);
      }
      try {
        var decoded = decodeBase64(s);
        var bytes = new Uint8Array(decoded.length);
        for (var i = 0; i < decoded.length; ++i) {
          bytes[i] = decoded.charCodeAt(i);
        }
        return bytes;
      } catch (_) {
        throw new Error("Converting base64 string to bytes failed.");
      }
    }
    function tryParseAsDataURI(filename) {
      if (!isDataURI(filename)) {
        return;
      }
      return intArrayFromBase64(filename.slice(dataURIPrefix.length));
    }
    function checkIncomingModuleAPI() {
      ignoredModuleProp("fetchSettings");
    }
    var asmLibraryArg = { "__assert_fail": ___assert_fail, "abort": _abort, "emscripten_memcpy_big": _emscripten_memcpy_big, "emscripten_resize_heap": _emscripten_resize_heap };
    createWasm();
    Module2["___wasm_call_ctors"] = createExportWrapper("__wasm_call_ctors");
    Module2["_meshopt_simplifyWithAttributes"] = createExportWrapper("meshopt_simplifyWithAttributes");
    Module2["_meshopt_simplifySloppy"] = createExportWrapper("meshopt_simplifySloppy");
    Module2["_meshopt_generateShadowIndexBuffer"] = createExportWrapper("meshopt_generateShadowIndexBuffer");
    Module2["___errno_location"] = createExportWrapper("__errno_location");
    Module2["_fflush"] = createExportWrapper("fflush");
    Module2["_malloc"] = createExportWrapper("malloc");
    var _emscripten_stack_init = Module2["_emscripten_stack_init"] = function() {
      return (_emscripten_stack_init = Module2["_emscripten_stack_init"] = Module2["asm"]["emscripten_stack_init"]).apply(null, arguments);
    };
    Module2["_emscripten_stack_get_free"] = function() {
      return (Module2["_emscripten_stack_get_free"] = Module2["asm"]["emscripten_stack_get_free"]).apply(null, arguments);
    };
    Module2["_emscripten_stack_get_base"] = function() {
      return (Module2["_emscripten_stack_get_base"] = Module2["asm"]["emscripten_stack_get_base"]).apply(null, arguments);
    };
    var _emscripten_stack_get_end = Module2["_emscripten_stack_get_end"] = function() {
      return (_emscripten_stack_get_end = Module2["_emscripten_stack_get_end"] = Module2["asm"]["emscripten_stack_get_end"]).apply(null, arguments);
    };
    var stackSave = Module2["stackSave"] = createExportWrapper("stackSave");
    var stackRestore = Module2["stackRestore"] = createExportWrapper("stackRestore");
    var stackAlloc = Module2["stackAlloc"] = createExportWrapper("stackAlloc");
    Module2["ccall"] = ccall;
    Module2["cwrap"] = cwrap;
    var unexportedRuntimeSymbols = ["run", "UTF8ArrayToString", "UTF8ToString", "stringToUTF8Array", "stringToUTF8", "lengthBytesUTF8", "addOnPreRun", "addOnInit", "addOnPreMain", "addOnExit", "addOnPostRun", "addRunDependency", "removeRunDependency", "FS_createFolder", "FS_createPath", "FS_createDataFile", "FS_createPreloadedFile", "FS_createLazyFile", "FS_createLink", "FS_createDevice", "FS_unlink", "getLEB", "getFunctionTables", "alignFunctionTables", "registerFunctions", "prettyPrint", "getCompilerSetting", "print", "printErr", "callMain", "abort", "keepRuntimeAlive", "wasmMemory", "stackAlloc", "stackSave", "stackRestore", "getTempRet0", "setTempRet0", "writeStackCookie", "checkStackCookie", "intArrayFromBase64", "tryParseAsDataURI", "ptrToString", "zeroMemory", "stringToNewUTF8", "exitJS", "getHeapMax", "emscripten_realloc_buffer", "ENV", "ERRNO_CODES", "ERRNO_MESSAGES", "setErrNo", "inetPton4", "inetNtop4", "inetPton6", "inetNtop6", "readSockaddr", "writeSockaddr", "DNS", "getHostByName", "Protocols", "Sockets", "getRandomDevice", "warnOnce", "traverseStack", "UNWIND_CACHE", "convertPCtoSourceLocation", "readAsmConstArgsArray", "readAsmConstArgs", "mainThreadEM_ASM", "jstoi_q", "jstoi_s", "getExecutableName", "listenOnce", "autoResumeAudioContext", "dynCallLegacy", "getDynCaller", "dynCall", "handleException", "runtimeKeepalivePush", "runtimeKeepalivePop", "callUserCallback", "maybeExit", "safeSetTimeout", "asmjsMangle", "asyncLoad", "alignMemory", "mmapAlloc", "writeI53ToI64", "writeI53ToI64Clamped", "writeI53ToI64Signaling", "writeI53ToU64Clamped", "writeI53ToU64Signaling", "readI53FromI64", "readI53FromU64", "convertI32PairToI53", "convertI32PairToI53Checked", "convertU32PairToI53", "getCFunc", "uleb128Encode", "sigToWasmTypes", "generateFuncType", "convertJsFunctionToWasm", "freeTableIndexes", "functionsInTableMap", "getEmptyTableSlot", "updateTableMap", "addFunction", "removeFunction", "reallyNegative", "unSign", "strLen", "reSign", "formatString", "setValue", "getValue", "PATH", "PATH_FS", "intArrayFromString", "intArrayToString", "AsciiToString", "stringToAscii", "UTF16Decoder", "UTF16ToString", "stringToUTF16", "lengthBytesUTF16", "UTF32ToString", "stringToUTF32", "lengthBytesUTF32", "allocateUTF8", "allocateUTF8OnStack", "writeStringToMemory", "writeArrayToMemory", "writeAsciiToMemory", "SYSCALLS", "getSocketFromFD", "getSocketAddress", "JSEvents", "registerKeyEventCallback", "specialHTMLTargets", "maybeCStringToJsString", "findEventTarget", "findCanvasEventTarget", "getBoundingClientRect", "fillMouseEventData", "registerMouseEventCallback", "registerWheelEventCallback", "registerUiEventCallback", "registerFocusEventCallback", "fillDeviceOrientationEventData", "registerDeviceOrientationEventCallback", "fillDeviceMotionEventData", "registerDeviceMotionEventCallback", "screenOrientation", "fillOrientationChangeEventData", "registerOrientationChangeEventCallback", "fillFullscreenChangeEventData", "registerFullscreenChangeEventCallback", "JSEvents_requestFullscreen", "JSEvents_resizeCanvasForFullscreen", "registerRestoreOldStyle", "hideEverythingExceptGivenElement", "restoreHiddenElements", "setLetterbox", "currentFullscreenStrategy", "restoreOldWindowedStyle", "softFullscreenResizeWebGLRenderTarget", "doRequestFullscreen", "fillPointerlockChangeEventData", "registerPointerlockChangeEventCallback", "registerPointerlockErrorEventCallback", "requestPointerLock", "fillVisibilityChangeEventData", "registerVisibilityChangeEventCallback", "registerTouchEventCallback", "fillGamepadEventData", "registerGamepadEventCallback", "registerBeforeUnloadEventCallback", "fillBatteryEventData", "battery", "registerBatteryEventCallback", "setCanvasElementSize", "getCanvasElementSize", "demangle", "demangleAll", "jsStackTrace", "stackTrace", "ExitStatus", "getEnvStrings", "checkWasiClock", "flush_NO_FILESYSTEM", "dlopenMissingError", "createDyncallWrapper", "setImmediateWrapped", "clearImmediateWrapped", "polyfillSetImmediate", "uncaughtExceptionCount", "exceptionLast", "exceptionCaught", "ExceptionInfo", "exception_addRef", "exception_decRef", "Browser", "setMainLoop", "wget", "FS", "MEMFS", "TTY", "PIPEFS", "SOCKFS", "_setNetworkCallback", "tempFixedLengthArray", "miniTempWebGLFloatBuffers", "heapObjectForWebGLType", "heapAccessShiftForWebGLHeap", "GL", "emscriptenWebGLGet", "computeUnpackAlignedImageSize", "emscriptenWebGLGetTexPixelData", "emscriptenWebGLGetUniform", "webglGetUniformLocation", "webglPrepareUniformLocationsBeforeFirstUse", "webglGetLeftBracePos", "emscriptenWebGLGetVertexAttrib", "writeGLArray", "AL", "SDL_unicode", "SDL_ttfContext", "SDL_audio", "SDL", "SDL_gfx", "GLUT", "EGL", "GLFW_Window", "GLFW", "GLEW", "IDBStore", "runAndAbortIfError", "ALLOC_NORMAL", "ALLOC_STACK", "allocate"];
    unexportedRuntimeSymbols.forEach(unexportedRuntimeSymbol);
    var missingLibrarySymbols = ["ptrToString", "zeroMemory", "stringToNewUTF8", "exitJS", "setErrNo", "inetPton4", "inetNtop4", "inetPton6", "inetNtop6", "readSockaddr", "writeSockaddr", "getHostByName", "getRandomDevice", "traverseStack", "convertPCtoSourceLocation", "readAsmConstArgs", "mainThreadEM_ASM", "jstoi_q", "jstoi_s", "getExecutableName", "listenOnce", "autoResumeAudioContext", "dynCallLegacy", "getDynCaller", "dynCall", "runtimeKeepalivePush", "runtimeKeepalivePop", "callUserCallback", "maybeExit", "safeSetTimeout", "asmjsMangle", "asyncLoad", "alignMemory", "mmapAlloc", "writeI53ToI64", "writeI53ToI64Clamped", "writeI53ToI64Signaling", "writeI53ToU64Clamped", "writeI53ToU64Signaling", "readI53FromI64", "readI53FromU64", "convertI32PairToI53", "convertI32PairToI53Checked", "convertU32PairToI53", "uleb128Encode", "sigToWasmTypes", "generateFuncType", "convertJsFunctionToWasm", "getEmptyTableSlot", "updateTableMap", "addFunction", "removeFunction", "reallyNegative", "unSign", "strLen", "reSign", "formatString", "intArrayFromString", "AsciiToString", "stringToAscii", "UTF16ToString", "stringToUTF16", "lengthBytesUTF16", "UTF32ToString", "stringToUTF32", "lengthBytesUTF32", "allocateUTF8", "allocateUTF8OnStack", "writeStringToMemory", "writeAsciiToMemory", "getSocketFromFD", "getSocketAddress", "registerKeyEventCallback", "maybeCStringToJsString", "findEventTarget", "findCanvasEventTarget", "getBoundingClientRect", "fillMouseEventData", "registerMouseEventCallback", "registerWheelEventCallback", "registerUiEventCallback", "registerFocusEventCallback", "fillDeviceOrientationEventData", "registerDeviceOrientationEventCallback", "fillDeviceMotionEventData", "registerDeviceMotionEventCallback", "screenOrientation", "fillOrientationChangeEventData", "registerOrientationChangeEventCallback", "fillFullscreenChangeEventData", "registerFullscreenChangeEventCallback", "JSEvents_requestFullscreen", "JSEvents_resizeCanvasForFullscreen", "registerRestoreOldStyle", "hideEverythingExceptGivenElement", "restoreHiddenElements", "setLetterbox", "softFullscreenResizeWebGLRenderTarget", "doRequestFullscreen", "fillPointerlockChangeEventData", "registerPointerlockChangeEventCallback", "registerPointerlockErrorEventCallback", "requestPointerLock", "fillVisibilityChangeEventData", "registerVisibilityChangeEventCallback", "registerTouchEventCallback", "fillGamepadEventData", "registerGamepadEventCallback", "registerBeforeUnloadEventCallback", "fillBatteryEventData", "battery", "registerBatteryEventCallback", "setCanvasElementSize", "getCanvasElementSize", "getEnvStrings", "checkWasiClock", "flush_NO_FILESYSTEM", "createDyncallWrapper", "setImmediateWrapped", "clearImmediateWrapped", "polyfillSetImmediate", "ExceptionInfo", "exception_addRef", "exception_decRef", "setMainLoop", "_setNetworkCallback", "heapObjectForWebGLType", "heapAccessShiftForWebGLHeap", "emscriptenWebGLGet", "computeUnpackAlignedImageSize", "emscriptenWebGLGetTexPixelData", "emscriptenWebGLGetUniform", "webglGetUniformLocation", "webglPrepareUniformLocationsBeforeFirstUse", "webglGetLeftBracePos", "emscriptenWebGLGetVertexAttrib", "writeGLArray", "SDL_unicode", "SDL_ttfContext", "SDL_audio", "GLFW_Window", "runAndAbortIfError", "ALLOC_NORMAL", "ALLOC_STACK", "allocate"];
    missingLibrarySymbols.forEach(missingLibrarySymbol);
    var calledRun;
    dependenciesFulfilled = function runCaller() {
      if (!calledRun) run();
      if (!calledRun) dependenciesFulfilled = runCaller;
    };
    function stackCheckInit() {
      _emscripten_stack_init();
      writeStackCookie();
    }
    function run(args) {
      if (runDependencies > 0) {
        return;
      }
      stackCheckInit();
      preRun();
      if (runDependencies > 0) {
        return;
      }
      function doRun() {
        if (calledRun) return;
        calledRun = true;
        Module2["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        readyPromiseResolve(Module2);
        if (Module2["onRuntimeInitialized"]) Module2["onRuntimeInitialized"]();
        assert(!Module2["_main"], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');
        postRun();
      }
      if (Module2["setStatus"]) {
        Module2["setStatus"]("Running...");
        setTimeout(function() {
          setTimeout(function() {
            Module2["setStatus"]("");
          }, 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
      checkStackCookie();
    }
    if (Module2["preInit"]) {
      if (typeof Module2["preInit"] == "function") Module2["preInit"] = [Module2["preInit"]];
      while (Module2["preInit"].length > 0) {
        Module2["preInit"].pop()();
      }
    }
    run();
    return Module2.ready;
  };
})();

export { Module as default };
