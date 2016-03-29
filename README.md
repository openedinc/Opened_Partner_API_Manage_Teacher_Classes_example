# class-roster-sample
This is an example application of using "Opened Partner API - Manage Teacher Classes" written in JavaScript.
To avoid the Cross-Domain-Requests problem the simple local proxy server written in Ruby is used.


### Prerequisities:

* Ruby
* CLIENT_ID and APP_SECRET received from OpenEd Inc.
* Internet connection


### How to run:

1. Open app.rb in your favorite text editor and replace the following constants with your actual clientId and appSecret values received from OpenEd: ```CLIENT_ID = 'YOUR.CLIENT.ID.GRANTED.BY.OPENED'``` and ```APP_SECRET = 'THE.APP.SECRET.SHARED.BETWEEN.YOU.AND.OPENED'```

2. ```$ cd ruby```

3. ```$ bundle install```

4. ```$ ruby app.rb```

5. open the following address with your web browser: ```http://localhost:1967```



Full documentation of the OpenEd Partner API can be found [here](http://docs.opened.apiary.io/).


Enjoy!


> ***NOTE:*** If you'll get the error message about something like 
> that your Ruby version differs from the app's version, 
> you can change this value - ruby '2.2.3' - inside the Gemfile
> (the app actually should work even with Ruby 2.0.0) 
> OR change your Ruby version using some tools like <a href="https://rvm.io/" target="_blank">RVM</a> 
> or <a href="https://github.com/sstephenson/rbenv" target="_blank">rbenv</a>.


> ***HINT:*** If you want to see the debug output in the browser's JavaScript console
> open the file '/views/partner_api.js' and set there at very top
> var DEBUG to true instead of false

