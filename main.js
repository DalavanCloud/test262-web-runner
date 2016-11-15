var runningTasks = [];
var backlogTasks = [];
var maxRunningTasks = 4;

var cache = {};

var ref = '';
var repo = 'https://api.github.com/repos/tc39/test262/contents/';

function enqueue(task) {
  if (runningTasks.length < maxRunningTasks) {
    runningTasks.push(task);
    task();
  } else {
    backlogTasks.push(task);
  }
}

function complete(task) {
  var index = runningTasks.indexOf(task);
  if (index !== -1) {
    runningTasks.splice(index, 1);
    if (backlogTasks.length > 0) {
      var next = backlogTasks.shift();
      runningTasks.push(next);
      next();
    }
  } else {
    console.log('task not found', task)
  }
}

function load(url, then, error) {
  // 'then' takes 'task' as its first parameter and calls complete(task) when done.
  // it takes the loaded data as its second parameter.
  // 'error' takes as 'task' as its first parameter and calls complete(task) when done.

  enqueue(function task() {
    if (cache.hasOwnProperty(url)) {
      if (cache[url].pending) {
        cache[url].pending.push({ task: task, then: then, error: error });
      } else {
        then(task, cache[url].data);        
      }
    } else {
      cache[url] = {pending: []}; // This will contain any other tasks which are waiting on the same URL while this request is pending.
      var req = new XMLHttpRequest;
      req.addEventListener('load', function() {
        var data = this.responseText;
        var waiting = cache[url].pending;
        try {
          data = JSON.parse(data);
          if (data.message) {
            throw null;
          }
          cache[url] = {data: data};
          then(task, data);
          waiting.forEach(function(obj) { obj.then(obj.task, data); });
        } catch(e) {
          delete cache[url];
          error(task);
          waiting.forEach(function(obj) { obj.error(obj.task); });
        }
      });
      req.addEventListener('error', function() {
        var waiting = cache[url].pending;
        delete cache[url];
        error(task);
        waiting.forEach(function(obj) { obj.error(obj.task); });
      });
      req.open('GET', url);
      req.send();
    }
  });
}

// end cache/fetch primitives

function loadSubtree(url, container) {
  container.loadState = 1;
  load(repo + url, function then(task, data) {
    var list = container.appendChild(document.createElement('ul'));
    data.forEach(function(item) {
      var li = document.createElement('li');
      if (item.type === 'dir') {
        li.innerText = '[+] ' + item.name;
        li.loadState = 0;
        li.addEventListener('click', function(e) {
          e.stopPropagation();
          switch (li.loadState) {
            case 0:
              loadSubtree(item.path, li);
              break;
            case 1:
              console.log(1);
              break;
            case 2:
              var subtree = li.querySelector('ul');
              if (subtree.style.display === 'none') {
                subtree.style.display = '';
              } else {
                subtree.style.display = 'none';
              }
              break;
          }
        });
      } else {
        li.innerText = item.name;
      }
      list.appendChild(li);
    });
    container.loadState = 2;
    complete(task);
  }, function error(task) {
    document.getElementById('error').innerHTML = 'Error!';
    complete(task);
  });
}

window.addEventListener('load', function() {
  loadSubtree('test', document.getElementById('tree'));
});

