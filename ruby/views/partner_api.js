;var partner_api = window.partner_api || (function (win, doc, $, undefined) {
  'use strict';

  /*******************************************************************************
   * 'PRIVATE' SCOPE (the user wont be able to call these methods from the outer)
   *******************************************************************************/

  var DEBUG   = false,// set it to 'true' to view the debug info in console
      options = {};

  /**
  * Clone object reqursively (date, objects, arrays)
  * @param  {Object} o
  * @return {Object}
  */
  function cloneObject(o) {
    if(!o || "object" !== typeof o) return o;
    if (o instanceof Date) return new Date(o.getTime());
    var p, v, c = "function" === typeof o.pop ? [] : {};
    for(p in o) {
      if(o.hasOwnProperty(p)) {
        v = o[p];
        if(v && "object" === typeof v) c[p] = this.clone(v);
        else c[p] = v;
      }
    }
    return c;
  }

  function saveToken(tokenData) {
    for (var name in tokenData) {
      localStorage.setItem(options.tokenPrefix + '.' + name, tokenData[name]);
    }
  }

  function removeToken() {
    localStorage.removeItem(options.tokenPrefix + '.access_token');
    localStorage.removeItem(options.tokenPrefix + '.expires_in');
  }

  function getToken() {
    return localStorage.getItem(options.tokenPrefix + '.access_token');
  }

  /*
  // TODO: we don't check token's expiration date in this example
  function getTokenDuration() {
    return localStorage.getItem(options.tokenPrefix + '.expires_in');
  }
  */


  function init(input) {
    // check input
    if (!input || !input.client_id || !input.signed_request) {
      throw new Error('ERROR: Bad input parameters passed to init()');
    }

    // init private options object
    options = cloneObject(input);
    options.tokenPrefix = '_openEd';
    options.apiHost     = 'https://partner.opened.com';
    options.proxyHost   = 'http://localhost:1967';
    DEBUG && console.info('init() : options = ', options);

    // TODO: we don't check token's expiration date in this example
    // so lets just request for a new token on every initialization (ie on every page reload)
    if(getToken()) {
      removeToken();
    }

    // ask the API for a token
    $.ajax({
      type: "POST",
      url: options.proxyHost + '/oauth/silent_login',
      data: options.signed_request,
      success: function(data) {
        DEBUG && console.info('SUCCESS: data = ', data);
        saveToken(JSON.parse(data));
        options.oauth_str = "Bearer " + getToken();
        DEBUG && console.info('token SAVED OK, options.oauth_str = ' + options.oauth_str);
        listGroups(/*[266263]*/);
        listStudents(/*[729490, 729936]*/);
        initListeners();
      },
      error: function(errdata) {
        throw new Error("ERROR on silent_login: ", errdata.error);
      }
    });
  }


  function initListeners() {
    
    var $group_title  = $('#group_title'),
        $grades_range = $('#grades_range'),
        $fg_gtitle    = $('#fg_gtitle'),
        $first_name   = $('#first_name'),
        $fs_lname     = $('#fs_lname'),
        $last_name    = $('#last_name'),
        $fs_fname     = $('#fs_fname'),
        $fs_uname     = $('#fs_uname'),
        $username     = $('#username'),
        $fs_pass      = $('#fs_pass'),
        $password     = $('#password'),
        $create_class_modal   = $('#create_class_modal'),
        $create_student_modal = $('#create_student_modal');

    $('#info_modal').on('show.bs.modal', function (event) {
      var modal   = $(this),
          trigger = $(event.relatedTarget),
          did     = trigger.attr('data-id'),
          type    = trigger.attr('data-infotype');

      modal.find('.modal-title').text((type === 'group' ? "Class" : "Student")+" ID " + did + ":");
      modal.find('.modal-body').empty();
      modal.find('.modal-body').html('<div class="loadingspinner"><img src="/img/loading.gif" /></div>');
      if(type === 'group') {
        getGroup(did, true, modal);
      } else {
        getStudent(did, modal);
      }
    });

    $create_class_modal.on('shown.bs.modal', function (event) {
      $group_title.focus();
    });
    $create_class_modal.on('hide.bs.modal', function (event) {
      // clear inputs
      $fg_gtitle.removeClass('has-error');
      $group_title.val('');
      $grades_range.val('');
      $group_title.focus();
    });

    $create_student_modal.on('shown.bs.modal', function (event) {
      $first_name.focus();
    });
    $create_student_modal.on('hide.bs.modal', function (event) {
      // clear inputs
      $fs_fname.removeClass('has-error');
      $first_name.val('');
      $fs_lname.removeClass('has-error');
      $last_name.val('');
      $fs_uname.removeClass('has-error');
      $username.val('');
      $fs_pass.removeClass('has-error');
      $password.val('');
    });

    // input listeners
    $group_title.on('keyup', function (event) {
      $fg_gtitle.removeClass('has-error');
    });
    $first_name.on('keyup', function (event) {
      $fs_fname.removeClass('has-error');
    });
    $last_name.on('keyup', function (event) {
      $fs_lname.removeClass('has-error');
    });
    $username.on('keyup', function (event) {
      $fs_uname.removeClass('has-error');
    });
    $password.on('keyup', function (event) {
      $fs_pass.removeClass('has-error');
    });

    // simple 'Create Class' form validation
    $('#create_group_btn').on('click', function (event) {
      var gtitle = $group_title.val().trim(),
          grrange = $grades_range.val().trim();
      if(!gtitle) {
        $fg_gtitle.addClass('has-error');
        $group_title.val(gtitle);
        $group_title.focus();
      } else {
        createGroup(gtitle, grrange);
        $create_class_modal.modal('hide');
      }
    });

    // simple 'Create Student' form validation
    $('#create_student_btn').on('click', function (event) {
      var hasErrors = false,
          sfname = $first_name.val().trim(),
          slname = $last_name.val().trim(),
          suname = $username.val().trim(),
          spass = $password.val().trim();
      if(!sfname) {
        hasErrors = true;
        $fs_fname.addClass('has-error');
        $first_name.val(sfname);
        $first_name.focus();
      }
      if(!slname) {
        hasErrors = true;
        $fs_lname.addClass('has-error');
        $last_name.val(slname);
        $last_name.focus();
      }
      if(!suname) {
        hasErrors = true;
        $fs_uname.addClass('has-error');
        $username.val(suname);
        $username.focus();
      }
      if(!spass) {
        hasErrors = true;
        $fs_pass.addClass('has-error');
        $password.val(spass);
        $password.focus();
      }

      if(!hasErrors) {
        createStudent(sfname, slname, suname, spass);
        $create_student_modal.modal('hide');
      }
    });
  }


  function clearGroupsList() {
    $('#classes_list').empty();
    $('#classes_list').html('<div class="list-group-item active"> \
      <div class="row"> \
        <div class="col-xs-12"> \
          <ul class="nav nav-pills"> \
            <li role="presentation" class="active listtitle">My Classes</li> \
            <li role="presentation" class="active dropdown pull-right"> \
              <a class="dropdown-toggle" data-toggle="dropdown" href="#" role="button" aria-haspopup="true" aria-expanded="false">Manage <span class="caret"></span></a> \
              <ul class="dropdown-menu"> \
                <li><a href="#" data-toggle="modal" data-target="#create_class_modal">Create Class</a></li> \
                <li class="disabled"><a href="#">Update Class</a></li> \
                <li class="disabled"><a href="#">Remove Class</a></li> \
                <li role="separator" class="divider"></li> \
                <li><a href="#">Close</a></li> \
              </ul> \
            </li> \
          </ul> \
        </div> \
      </div> \
    </div> \
    <div id="classes_loader" class="loadingspinner"><img src="/img/loading.gif" /></div>');
  }


  function clearStudentsList() {
    $('#students_list').empty();
    $('#students_list').html('<div class="list-group-item active"> \
      <div class="row"> \
        <div class="col-xs-12"> \
          <ul class="nav nav-pills"> \
            <li role="presentation" class="active listtitle">My Students</li> \
            <li role="presentation" class="active dropdown pull-right"> \
              <a class="dropdown-toggle" data-toggle="dropdown" href="#" role="button" aria-haspopup="true" aria-expanded="false">Manage <span class="caret"></span></a> \
              <ul class="dropdown-menu"> \
                <li><a href="#" data-toggle="modal" data-target="#create_student_modal">Create Student</a></li> \
                <li class="disabled"><a href="#">Update Student</a></li> \
                <li class="disabled"><a href="#">Remove Student</a></li> \
                <li role="separator" class="divider"></li> \
                <li><a href="#">Close</a></li> \
              </ul> \
            </li> \
          </ul> \
        </div> \
      </div> \
    </div> \
    <div id="students_loader" class="loadingspinner"><img src="/img/loading.gif" /></div>');
  }


  function generatePostfix(ids_arr) {
    if(!ids_arr) { return ""; }
    var postfix = "";
    for(var i = 0, l = ids_arr.length; i < l; i++) {
      postfix += (i !== 0) ? "&" : "?";
      postfix += "ids[]="+ids_arr[i];
    }
    return postfix;
  }


  function resetGroupNode(node) {
    $('.loader').remove();
    node.droppable('enable');
  }


  function updateGroupNode(node, data_obj) {
    node.empty();
    node.text(data_obj.class.title);
    var stud_ids = [];
    data_obj.students.forEach(function(student) {
      stud_ids.push(student.id);
    });
    node.attr('data-students', stud_ids.join(','));
    node.append($('<span>', {'class':'badge'}).text(data_obj.students.length));
    $('.loader').remove();
    node.droppable('enable');
  }


  // GET https://partner.opened.com/1/teachers/classes?ids=ids
  function listGroups(groups_ids_arr) {
    var postfix = "";
    if(groups_ids_arr) {
      postfix = generatePostfix(groups_ids_arr);
    }

    clearGroupsList();

    $.ajax({
      type: "GET",
      url: options.proxyHost+'/teachers/classes'+postfix,
      headers: {
        "Authorization": options.oauth_str
      },
      success: function(data) {
        DEBUG && console.info("List Classes :: GET /teachers/classes"+postfix+" : ", data);
        
        var data_obj  = JSON.parse(data),
            frag      = $(document.createDocumentFragment()),
            item      = null,
            badge     = null;

        data_obj.classes.forEach(function(group) {
          item = $('<a>', {'href':'#', 'class':'list-group-item group', 'data-id': group.id, 'data-grades-range':group.grades_range, 'data-toggle':'modal', 'data-target':'#info_modal', 'data-infotype':'group', 'data-students': group.student_ids+''}).text(group.title);
          if(group.student_ids.length) {
            item.append($('<span>', {'class':'badge'}).text(group.student_ids.length));
          }
          frag.append(item);
        });
        $('#classes_loader').hide();
        $('#classes_list').append(frag);

        $(".group").droppable({
          scope: "studgroup",
          disabled: false,
          drop: function(event, ui) {
            var students  = $(this).attr('data-students'),
                elem      = ui.draggable,
                draggedid = elem.attr('data-id');
            elem.draggable('option', 'revert', false);
            if(students && students.indexOf(draggedid) > -1) {
              elem.draggable('option', 'revert', true);
              return;
            }
            addStudentsToGroup($(this), draggedid);
          }
        });
      },
      error: function(errdata) {
        $('#classes_loader').hide();
        throw new Error("ERROR in listGroups(): ", errdata.error);
      }
    });
  }


  // GET https://partner.opened.com/1/teachers/classes/class_id
  function getGroup(group_id, node, modal) {
    if(!group_id || !node) {
      throw new Error("ERROR: bad parameters passed to getGroup()");
    }
    $.ajax({
      type: "GET",
      url: options.proxyHost+"/teachers/classes/"+group_id,
      headers: {
        "Authorization": options.oauth_str
      },
      success: function(data) {
        DEBUG && console.info("GET Class :: GET /teachers/classes/"+group_id+" : ", data);
        if(!modal) {
          updateGroupNode(node, JSON.parse(data));
        } else {
          modal.find('.modal-body').empty();
          var data_obj = JSON.parse(data);
          modal.find('.modal-body').html('<div class="row"> \
              <div class="col-xs-4">Title:</div> \
              <div class="col-xs-8">'+data_obj.class.title+'</div> \
            </div> \
            <div class="row"> \
              <div class="col-xs-4">Created at:</div> \
              <div class="col-xs-8">'+data_obj.class.created_at+'</div> \
            </div> \
            <div class="row"> \
              <div class="col-xs-4">Grades range:</div> \
              <div class="col-xs-8">'+data_obj.class.grades_range+'</div> \
            </div> \
            <div class="row"> \
              <div class="col-xs-4">Standard areas:</div> \
              <div class="col-xs-8">'+data_obj.standard_areas.length+'</div> \
            </div> \
            <div class="row"> \
              <div class="col-xs-4">Students:</div> \
              <div class="col-xs-8">'+data_obj.students.length+'</div> \
            </div> \
            <div class="row"> \
              <div class="col-xs-4">Owner(s):</div> \
              <div id="owners" class="col-xs-8"></div> \
            </div>');
          data_obj.owners.forEach(function(owner) {
            $('#owners').append("First name: " + owner.first_name + "; Last name: " + owner.last_name + "; Username: " + owner.username + "<br/>");
          });
          // for EDIT:
          // modal.find('.modal-body input').val(data);
        }
      },
      error: function(errdata) {
        resetGroupNode(node);
        throw new Error("ERROR in getGroup(): ", errdata.error);
      }
    });
  }


  // POST https://partner.opened.com/1/teachers/classes/class_id/add_students
  function addStudentsToGroup(node, student_id) {
    //var rbody = {
    //  'student_ids': [
    //    719701,
    //    719704
    //  ]
    //};
    if(!node || !student_id) { 
      throw new Error("ERROR: bad parameters passed to addStudentsToGroup()");
    }

    node.droppable('disable');
    node.append($('<div>', {'class':'loader'}).html('<img src="/img/loading_small.gif" />'));
    
    var group_id = node.attr('data-id');
    $.ajax({
      type: "POST",
      url: options.proxyHost+"/teachers/classes/"+group_id+"/add_students",
      headers: {
        "Authorization": options.oauth_str
      },
      data: JSON.stringify({'student_ids':[student_id]}),
      success: function(data) {
        DEBUG && console.info("Add student :: POST /teachers/classes/"+group_id+"/add_students : ", data);
        getGroup(group_id, node);
      },
      error: function(errdata) {
        resetGroupNode(node);
        throw new Error("ERROR in addStudentsToGroup(): ", errdata.error);
      }
    });
  }


  // POST https://partner.opened.com/1/teachers/classes/class_id/remove_students
  function removeStudentsFromGroup(group_id, students_ids) {
    if(!group_id || !student_ids) {
      throw new Error("ERROR: bad parameters passed to removeStudentsFromGroup()");
    }
    var rbody = {
      'student_ids': students_ids
    };
    $.ajax({
      type: "POST",
      url: options.proxyHost+"/teachers/classes/"+group_id+"/remove_students",
      headers: {
        "Authorization": options.oauth_str
      },
      data: JSON.stringify(rbody),
      success: function(data) {
        DEBUG && console.info("Remove students from the Class :: POST /teachers/classes/"+group_id+"/remove_students : ", data);
      },
      error: function(errdata) {
        throw new Error("ERROR in removeStudentsFromGroup(): ", errdata.error);
      }
    });
  }


  // POST https://partner.opened.com/1/teachers/classes
  function createGroup(title, grades_range) {
    if(!title) {
      throw new Error("ERROR: bad parameters passed to createGroup()");
    }
    var rbody = {
      'class': {
        'title': title,             // (string) - The class title, required
        'grades_range': grades_range// (string) - class grades_range, optional, in formats: '5', '5-5', '6-8'
      }
    };
    $.ajax({
      type: "POST",
      url: options.proxyHost+"/teachers/classes",
      headers: {
        "Authorization": options.oauth_str
      },
      data: JSON.stringify(rbody),
      success: function(data) {
        DEBUG && console.info("Create New Class :: POST /teachers/classes : ", data);
        listGroups();
      },
      error: function(errdata) {
        throw new Error("ERROR in createGroup(): ", errdata.error);
      }
    });
  }


/* not used in this example
  // PUT https://partner.opened.com/1/teachers/classes/class_id
  function updateGroup(group_id, title, grades_range) {
    if(!group_id || !title) {
      throw new Error("ERROR: bad parameters passed to updateGroup()");
    }
    var rbody = {
      'class': {
        'title': title,                    // (string) - The class title, optional
        'grades_range': grades_range || '' // (string) - class grades_range, optional, in formats: '5', '5-5', '6-8'
      }
    };
    $.ajax({
      type: "PUT",
      url: options.proxyHost+"/teachers/classes/"+group_id,
      headers: {
        "Authorization": options.oauth_str
      },
      data: JSON.stringify(rbody),
      success: function(data) {
        DEBUG && console.info("Update Class :: PUT /teachers/classes/"+group_id+" : ", data);
      },
      error: function(errdata) {
        throw new Error("ERROR in updateGroup(): ", errdata.error);
      }
    });
  }
*/
  

  // DELETE https://partner.opened.com/1/teachers/classes/class_id
  function removeGroup(group_id) {
    if(!group_id) {
      throw new Error("ERROR: bad parameters passed to removeGroup()");
    }
    $.ajax({
      type: "DELETE",
      url: options.proxyHost+"/teachers/classes/"+group_id,
      headers: {
        "Authorization": options.oauth_str
      },
      success: function(data) {
        DEBUG && console.info("Remove Class :: DELETE /teachers/classes/"+group_id+" : ", data);
      },
      error: function(errdata) {
        throw new Error("ERROR in removeGroup(): ", errdata.error);
      }
    });
  }

  
  // GET https://partner.opened.com/1/teachers/students?ids=ids
  function listStudents(students_ids_arr) {   
    var postfix = "";
    if(students_ids_arr) {
      postfix = generatePostfix(students_ids_arr);
    }

    clearStudentsList();

    $.ajax({
      type: "GET",
      url: options.proxyHost+'/teachers/students'+postfix,
      headers: {
        "Authorization": options.oauth_str
      },
      success: function(data) {
        DEBUG && console.info("List Students :: GET /teachers/students"+postfix+" : ", data);

        var data_obj  = JSON.parse(data),
            frag      = $(document.createDocumentFragment()),
            item      = null;
        
        data_obj.students.forEach(function(student) {
          item = $('<a>', {'href': '#', 'class': 'list-group-item student', 'data-id': student.id, 'data-toggle':'modal', 'data-target':'#info_modal', 'data-infotype':'student'}).text(student.first_name+' '+student.last_name);
          frag.append(item);
        });
        $('#students_loader').hide();
        $('#students_list').append(frag);

        $(".student").draggable({
          delay: 300,
          helper: "clone",
          cursor: "crosshair",
          opacity: 0.75,
          snap: ".group",
          snapMode: "inner",
          snapTolerance: 10,
          scope: "studgroup",
          start: function(event, ui) {/* dunno */},
          drag: function(event, ui) {/* dunno */},
          stop: function(event, ui) {/* dunno */}
        });
      },
      error: function(errdata) {
        $('#students_loader').hide();
        throw new Error("ERROR in listStudents(): ", errdata.error);
      }
    });
  }


  // POST https://partner.opened.com/1/teachers/students
  function createStudent(first_name, last_name, username, password) {
    if(!first_name || !last_name || !username || !password) {
      throw new Error("ERROR: bad parameters passed to createStudent()");
    }
    var rbody = {
      'student': {
        'first_name': first_name, // (string) - Student's first_name, required
        'last_name': last_name,   // (string) - Student's last_name, required
        'username': username,     // (string) - Student's username, required
        'password': password,     // (string) - Student's password, required
        'class_ids': [            // (array[int]) - ids of classes new student needs to be added, optional
          //4812
        ]
      }
    };
    $.ajax({
      type: "POST",
      url: options.proxyHost+"/teachers/students",
      headers: {
        "Authorization": options.oauth_str
      },
      data: JSON.stringify(rbody),
      success: function(data) {
        DEBUG && console.info("Create Student :: POST /teachers/students : ", data);
        listStudents();
      },
      error: function(errdata) {
        throw new Error("ERROR in createStudent(): ", errdata.error);
      }
    });
  }


  // GET https://partner.opened.com/1/teachers/students/student_id
  function getStudent(student_id, modal) {
    if(!student_id) {
      throw new Error("ERROR: bad parameters passed to getStudentInfo()");
    }

    $.ajax({
      type: "GET",
      url: options.proxyHost+"/teachers/students/"+student_id,
      headers: {
        "Authorization": options.oauth_str
      },
      success: function(data) {
        DEBUG && console.info("Student :: GET /teachers/students/"+student_id+" : ", data);
        if(modal) {
          modal.find('.modal-body').empty();
          var data_obj = JSON.parse(data).student;
          modal.find('.modal-body').html('<div class="row"> \
              <div class="col-xs-4">First name:</div> \
              <div class="col-xs-8">'+data_obj.first_name+'</div> \
            </div> \
            <div class="row"> \
              <div class="col-xs-4">Last name:</div> \
              <div class="col-xs-8">'+data_obj.last_name+'</div> \
            </div> \
            <div class="row"> \
              <div class="col-xs-4">Username:</div> \
              <div class="col-xs-8">'+data_obj.username+'</div> \
            </div> \
            <div class="row"> \
              <div class="col-xs-4">Password:</div> \
              <div class="col-xs-8">******</div> \
            </div> \
            <div class="row"> \
              <div class="col-xs-4">Classes:</div> \
              <div class="col-xs-8">'+data_obj.class_ids.length+'</div> \
            </div>');
          // for EDIT:
          // modal.find('.modal-body input').val(data);
        }
      },
      error: function(data) {
        throw new Error("ERROR in getStudentInfo(): ", errdata.error);
      }
    });
  }


/* not used in this example
  // PUT https://partner.opened.com/1/teachers/students/student_id
  function updateStudent(student_id, first_name, last_name, password) {      
    if(!student_id || !first_name || !last_name || !password) {
      throw new Error("ERROR: bad parameters passed to updateStudent()");
    }
    var rbody = {
      'student': {
        'first_name': first_name,  // (string) - Student's first_name, required
        'last_name': last_name,    // (string) - Student's last_name, required
        'password': password       // (string) - Student's password, required
      }
    };
    $.ajax({
      type: "PUT",
      url: options.proxyHost+"/teachers/students/"+student_id,
      data: JSON.stringify(rbody),
      headers: {
        "Authorization": options.oauth_str
      },
      success: function(data) {
        DEBUG && console.info("Update Student :: PUT /teachers/students/"+student_id+" : ", data);
      },
      error: function(errdata) {
        throw new Error("ERROR in updateStudent(): ", errdata.error);
      }
    });
  }
*/

  
  // DELETE https://partner.opened.com/1/teachers/students/student_id
  function removeStudent(student_id) {
    if(!student_id) {
      throw new Error("ERROR: bad parameters passed to removeStudent()");
    }
    $.ajax({
      type: "DELETE",
      url: options.proxyHost+"/teachers/students/"+student_id,
      headers: {
        "Authorization": options.oauth_str
      },
      success: function(data) {
        DEBUG && console.info("Remove Student :: DELETE /teachers/students/"+student_id+" : ", data);
      },
      error: function(errdata) {
        throw new Error("ERROR in removeStudent(): ", errdata.error);
      }
    });
  }


  
  /****************************************************************************
   * PUBLIC INTERFACE (the user can call only these methods from the outer)
   ****************************************************************************/
  return {
    init: init.bind(this)
  }
 
})(window, document, jQuery, undefined);
