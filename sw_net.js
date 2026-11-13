// Sector Warfare browser plugin: HTTP requests to the match server and token storage.
(function () {
  var reqs = {};
  var next = 1;
  function str(ptr, len) {
    return new TextDecoder().decode(new Uint8Array(wasm_memory.buffer, ptr, len));
  }
  miniquad_add_plugin({
    name: "sw_net",
    version: 1,
    register_plugin: function (importObject) {
      importObject.env.sw_http = function (post, urlPtr, urlLen, bodyPtr, bodyLen, tokPtr, tokLen) {
        var url = str(urlPtr, urlLen);
        var body = bodyLen > 0 ? str(bodyPtr, bodyLen) : null;
        var token = tokLen > 0 ? str(tokPtr, tokLen) : "";
        var id = next++;
        reqs[id] = null;
        var headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = "Bearer " + token;
        fetch(url, { method: post ? "POST" : "GET", body: post ? body : undefined, headers: headers })
          .then(function (r) {
            return r.text().then(function (t) { reqs[id] = { status: r.status, data: new TextEncoder().encode(t) }; });
          })
          .catch(function (e) {
            reqs[id] = { status: 0, data: new TextEncoder().encode('{"code":"NETWORK","detail":"server unreachable"}') };
          });
        return id;
      };
      importObject.env.sw_http_len = function (id) {
        var r = reqs[id];
        return r ? r.data.length : -1;
      };
      importObject.env.sw_http_status = function (id) {
        var r = reqs[id];
        return r ? r.status : 0;
      };
      importObject.env.sw_http_take = function (id, ptr) {
        var r = reqs[id];
        if (r) new Uint8Array(wasm_memory.buffer).set(r.data, ptr);
        delete reqs[id];
      };
      importObject.env.sw_store_get = function (ptr, max) {
        // a link like http://host:8080/#token=swpat_... resumes that seat
        var m = location.hash.match(/token=([A-Za-z0-9_]+)/);
        if (m) localStorage.setItem("sw_token", m[1]);
        var t = new TextEncoder().encode(localStorage.getItem("sw_token") || "");
        var n = Math.min(t.length, max);
        new Uint8Array(wasm_memory.buffer).set(t.subarray(0, n), ptr);
        return n;
      };
      importObject.env.sw_offline = function () {
        return window.SW_OFFLINE ? 1 : 0;
      };
      importObject.env.sw_hash = function (ptr, max) {
        var t = new TextEncoder().encode(location.hash || "");
        var n = Math.min(t.length, max);
        new Uint8Array(wasm_memory.buffer).set(t.subarray(0, n), ptr);
        return n;
      };
      importObject.env.sw_store_set = function (ptr, len) {
        localStorage.setItem("sw_token", str(ptr, len));
      };
    },
  });
})();
