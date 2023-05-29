# eM Client Starred/Flagged Email forwarder for Remember The Milk
This project is a quick hack to send all emails that have been "starred" or "flagged" in eM Client to Remember The Milk.
No guarantee is made that this will work for you, or that it will not break your computer, or that it will not cause the
end of the world (autocomplete told me to say that). The code might be horrible. It might follow the best practices. You
just never know with quick hacks. Use at your own risk.

# What Should Happen
* You flag an email (new or old) in eM Client -OR- eM Client downloads a flagged email
* You run this program
* The email is forwarded to your Remember The Milk TODO list.
* That email is cached in a local database so that it is not forwarded again.

# Setup
* git clone ...
* cd emclient-rtm
* cp env.example .env
* ACTUALLY EDIT .env
* npm install
* npm run start
* crontab -e... automate it!
