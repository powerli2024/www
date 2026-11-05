#include <unistd.h>
#include <stdio.h>

#define NUMBER 40

void answer(char * name, int x){
	printf("%s, the answer is %d\n", name, x );
}

void main(int argc, char *argv[]){
	int x;
	x = NUMBER + 2;
	answer(argv[1], x);
}

// gcc -E 42.c -o 42.i
// gcc -S 42.c -o 42.s
// gcc -c 42.c -o 42.o
// gcc 42.c -o 42