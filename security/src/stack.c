#include <stdlib.h>
#include <stdio.h>
#include <string.h>

int vulfunc(char *str)
{
	char buffer[100];
	strcpy(buffer, str);  //1
	return 1;
}

int main(){
	char str[400];
	FILE *badfile;

	badfile = fopen("badfile","r");
	fread(str, sizeof(char), 300, badfile);  //2
	vulfunc(str);

	printf("Returned properly\n");
	fclose(badfile);
	return 0;
}
/*
sudo sysctl -w kernel.randomize_va_space=0

gcc -fno-stack-protector -z execstack -o stack stack.c 

sudo chown root stack

sudo chmod 4755 stack



gcc  -g -fno-stack-protector -z execstack -o stack_gdb stack.c 

sudo sysctl -w kernel.randomize_va_space=0

touch badfile

start gdb for debugging
gdb ./stack_gdb

set a breakpoint at function vulfunc
b vulfunc

run the program
r

read epb
p $ebp
	0xbfffea98

read buffer addr
p &buffer
	0xbfffea2c

offset between buffer and ebp
	p 0xbfffea98 - 0xbfffea2c
	p/d 0xbfffea98 - 0xbfffea2c
	108
	108 + 4 = 112

quit



**/
