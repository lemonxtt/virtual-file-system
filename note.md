https://www.a2hosting.com/kb/developer-corner/mysql/managing-mysql-databases-and-users-from-the-command-line
https://www.inmotionhosting.com/support/website/how-to-create-a-database-using-mysql-from-the-command-line/

sudo mysql -u root -p
123456789
CREATE USER 'lemonxtt'@'localhost' IDENTIFIED BY 'jXCVaUjj8AdFHvj7';
GRANT ALL ON *.* TO 'lemonxtt'@'localhost';
FLUSH PRIVILEGES;
quit

sudo mysql -u lemonxtt -p
ALTER USER 'lemonxtt'@'localhost' IDENTIFIED WITH mysql_native_password BY 'jXCVaUjj8AdFHvj7';
flush privileges;

CREATE DATABASE virtual_file_system;
use virtual_file_system

/root/a
root/a
./root/a
../root/a
../../root/a

/ to ../../A
/a to ../A
/a to ../../A

ls
ls -l
ls 9
ls -l 9
ls 9 -l


## cr
{
    "currentPath": "/",
    "cmd": "cr -p hh/h2"
}

{
    "currentPath": "/a",
    "cmd": "cr -p hh/h2"
}

## rm
```
```

rm ./*
rm ./aa/*
rm ./dd/ee
rm abc
rm ab/bc
rm /aa/bb/cc

## mv
mv e1/e1-1 /
mv e1/e1-1 /a
mv e1/e1-1 .
mv e1/e1-1 ./
mv e1 a