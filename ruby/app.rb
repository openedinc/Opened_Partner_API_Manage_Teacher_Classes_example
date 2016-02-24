require 'base64'
require 'json'
require 'openssl'
require 'securerandom'
require 'sinatra'
require 'sinatra/cross_origin'
require 'rest-client'
require 'tilt/erubis'

enable :cross_origin
set :port, 1967

API_HOST    = 'https://partner.opened.com/1'
OAUTH_URL   = 'https://partner.opened.com/oauth/silent_login'

CLIENT_ID   = 'YOUR.CLIENT.ID.GRANTED.BY.OPENED'
APP_SECRET  = 'THE.APP.SECRET.SHARED.BETWEEN.YOU.AND.OPENED'

def base64_url_encode(str)
  Base64.encode64(str).tr('+/', '-_').gsub(/\s/, '').gsub(/=+\z/, '')
end

options '*' do
  response.headers['Allow'] = 'HEAD,GET,PUT,POST,DELETE,OPTIONS'
  response.headers['Access-Control-Allow-Headers'] = 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Cache-Control, Accept, Authorization'
  200
end

get '/' do
  send_file File.join('public/index.html')
end

get '/partner_api.js' do
  send_file File.join('views/partner_api.js')
end

get '/partner_api.css' do
  send_file File.join('views/partner_api.css')
end

get '/img/loading_small.gif' do
  send_file File.join('views/img/loading_small.gif')
end

get '/img/loading.gif' do
  send_file File.join('views/img/loading.gif')
end

get '/img/education-school.ico' do
  send_file File.join('/views/img/education-school.ico')
end

get '/favicon.ico' do
  send_file File.join('/views/img/education-school.ico')
end

post '/classes_and_students' do
  envelope = @params
  envelope["client_id"] ||= CLIENT_ID
  envelope["algorithm"] ||= 'HMAC-SHA256'
  envelope["token"] ||= SecureRandom.hex #It's important that this is unique by user
  # user can have optional association with their school by supplying NCES_ID
  # envelope["school_nces_id"] = '<nces_id>'

  envelope = JSON.dump(envelope)
  encoded_envelope = base64_url_encode(envelope)

  signature = OpenSSL::HMAC.hexdigest(OpenSSL::Digest::SHA256.new, APP_SECRET, encoded_envelope)
  encoded_signature = base64_url_encode(signature)

  @signed_request = "#{encoded_signature}.#{encoded_envelope}"
  @client_id = CLIENT_ID

  erb :classes_and_students
end


post '/oauth/silent_login' do
  url = "#{OAUTH_URL}"
  headers = {content_type: 'text/plain', accept: 'application/json'}
  body = request.body.read
  begin
    RestClient.post(url, body, headers)
  rescue RestClient::BadRequest => e
    return e.response
  end
end


#
# LIST CLASSES  ==> GET https://partner.opened.com/1/teachers/classes?ids=ids
# ( http://docs.opened.apiary.io/#reference/manage-teacher's-classes-and-students/teachers-classes/list-classes )
# 
get '/teachers/classes' do
  unless @params[:ids].nil?
    query_params = []
    @params[:ids].each do |id|
      query_params << "ids[]=#{id}"
    end
    url = "#{API_HOST}/teachers/classes?#{query_params.join('&')}"
  else
    url = "#{API_HOST}/teachers/classes"
  end
  content = {content_type: 'application/json', accept: 'application/json', authorization: request.env["HTTP_AUTHORIZATION"]}
  begin
    RestClient.get(url, content)
  rescue RestClient::BadRequest => e
    return e.response
  end
end

#
# GET CLASS   ==> GET https://partner.opened.com/1/teachers/classes/class_id
# ( http://docs.opened.apiary.io/#reference/manage-teacher's-classes-and-students/teachers-classes/class )
#
get '/teachers/classes/:class_id' do
  url = "#{API_HOST}/teachers/classes/#{params['class_id']}"
  content = {content_type: 'application/json', accept: 'application/json', authorization: request.env["HTTP_AUTHORIZATION"]}
  begin
    RestClient.get(url, content)
  rescue RestClient::BadRequest => e
    return e.response
  end
end

#
# CREATE NEW CLASS  ==> POST https://partner.opened.com/1/teachers/classes
# ( http://docs.opened.apiary.io/#reference/manage-teacher's-classes-and-students/teachers-classes/create-a-new-class )
#
post '/teachers/classes' do
  url = "#{API_HOST}/teachers/classes"
  headers = {content_type: 'application/json', accept: 'application/json', authorization: request.env["HTTP_AUTHORIZATION"]}
  body = JSON.parse(request.body.read)
  begin
    RestClient.post(url, body.to_json, headers)
  rescue RestClient::BadRequest => e
    return e.response
  end
end

# not used in this example
=begin
#
# UPDATE CLASS  ==> PUT https://partner.opened.com/1/teachers/classes/class_id
# ( http://docs.opened.apiary.io/#reference/manage-teacher's-classes-and-students/teachers-classes/update-class )
#
put '/teachers/classes/:class_id' do
  url = "#{API_HOST}/teachers/classes/#{params['class_id']}"
  headers = {content_type: 'application/json', accept: 'application/json', authorization: request.env["HTTP_AUTHORIZATION"]}
  body = JSON.parse(request.body.read)
  begin
    RestClient.put(url, body.to_json, headers)
  rescue RestClient::BadRequest => e
    return e.response
  end
end
=end

#
# REMOVE CLASS  ==> DELETE https://partner.opened.com/1/teachers/classes/class_id
# ( http://docs.opened.apiary.io/#reference/manage-teacher's-classes-and-students/teachers-classes/remove-a-class )
#
delete '/teachers/classes/:class_id' do
  url = "#{API_HOST}/teachers/classes/#{params['class_id']}"
  headers = {content_type: 'application/json', accept: 'application/json', authorization: request.env["HTTP_AUTHORIZATION"]}
  begin
    RestClient.delete(url, headers)
  rescue RestClient::BadRequest => e
    return e.response
  end
end

#
# ADD EXISTING STUDENTS TO THE CLASS  ==> POST https://partner.opened.com/1/teachers/classes/class_id/add_students
# ( http://docs.opened.apiary.io/#reference/manage-teacher's-classes-and-students/teachers-classes/add-existing-student-to-the-class )
#
post '/teachers/classes/:class_id/add_students' do
  url = "#{API_HOST}/teachers/classes/#{params['class_id']}/add_students"
  headers = {content_type: 'application/json', accept: 'application/json', authorization: request.env["HTTP_AUTHORIZATION"]}
  body = JSON.parse(request.body.read)
  begin
    RestClient.post(url, body.to_json, headers)
  rescue RestClient::BadRequest => e
    return e.response
  end
end

#
# REMOVE STUDENTS FROM THE CLASS  ==> POST https://partner.opened.com/1/teachers/classes/class_id/remove_students
# ( http://docs.opened.apiary.io/#reference/manage-teacher's-classes-and-students/teachers-classes/remove-student-from-the-class )
#
post '/teachers/classes/:class_id/remove_students' do
  url = "#{API_HOST}/teachers/classes/#{params['class_id']}/remove_students"
  headers = {content_type: 'application/json', accept: 'application/json', authorization: request.env["HTTP_AUTHORIZATION"]}
  body = JSON.parse(request.body.read)
  begin
    RestClient.post(url, body.to_json, headers)
  rescue RestClient::BadRequest => e
    return e.response
  end
end

#
# LIST STUDENTS   ==> GET https://partner.opened.com/1/teachers/students?ids=ids
# ( http://docs.opened.apiary.io/#reference/manage-teacher's-classes-and-students/teachers-students/list-students )
#
get '/teachers/students' do
  unless @params[:ids].nil?
    query_params = []
    @params[:ids].each do |id|
      query_params << "ids[]=#{id}"
    end
    url = "#{API_HOST}/teachers/students?#{query_params.join('&')}"
  else
    url = "#{API_HOST}/teachers/students"
  end
  content = {content_type: 'application/json', accept: 'application/json', authorization: request.env["HTTP_AUTHORIZATION"]}
  begin
    RestClient.get(url, content)
  rescue RestClient::BadRequest => e
    return e.response
  end
end

#
# GET STUDENT   ==> GET https://partner.opened.com/1/teachers/students/student_id
# ( http://docs.opened.apiary.io/#reference/manage-teacher's-classes-and-students/teachers-students/class )
#
get '/teachers/students/:student_id' do
  url = "#{API_HOST}/teachers/students/#{params['student_id']}"
  content = {content_type: 'application/json', accept: 'application/json', authorization: request.env["HTTP_AUTHORIZATION"]}
  begin
    RestClient.get(url, content)
  rescue RestClient::BadRequest => e
    return e.response
  end
end

#
# CREATE A STUDENT  => POST https://partner.opened.com/1/teachers/students
# ( http://docs.opened.apiary.io/#reference/manage-teacher's-classes-and-students/teachers-students/create-a-student )
#
post '/teachers/students' do
  url = "#{API_HOST}/teachers/students"
  headers = {content_type: 'application/json', accept: 'application/json', authorization: request.env["HTTP_AUTHORIZATION"]}
  body = JSON.parse(request.body.read)
  begin
    RestClient.post(url, body.to_json, headers)
  rescue RestClient::BadRequest => e
    return e.response
  end
end

# not used in this example
=begin
#
# UPDATE STUDENT  ==> PUT https://partner.opened.com/1/teachers/students/student_id
# ( http://docs.opened.apiary.io/#reference/manage-teacher's-classes-and-students/teachers-students/update-class )
#
put '/teachers/students/:student_id' do
  url = "#{API_HOST}/teachers/students/#{params['student_id']}"
  headers = {content_type: 'application/json', accept: 'application/json', authorization: request.env["HTTP_AUTHORIZATION"]}
  body = JSON.parse(request.body.read)
  begin
    RestClient.put(url, body.to_json, headers)
  rescue RestClient::BadRequest => e
    return e.response
  end
end
=end

#
# REMOVE A STUDENT  ==> DELETE https://partner.opened.com/1/teachers/students/student_id
# ( http://docs.opened.apiary.io/#reference/manage-teacher's-classes-and-students/teachers-students/remove-a-student )
#
delete '/teachers/students/:student_id' do
  url = "#{API_HOST}/teachers/students/#{params['student_id']}"
  headers = {content_type: 'application/json', accept: 'application/json', authorization: request.env["HTTP_AUTHORIZATION"]}
  begin
    RestClient.delete(url, headers)
  rescue RestClient::BadRequest => e
    return e.response
  end
end
