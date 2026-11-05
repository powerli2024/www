void foo(int x){
	int a;
	a = x;
}

void bar(){
	int b = 5;
	foo(b);
}

int main(){
	foo(2);
	bar(3);
	return 0;
}

/*
gcc pro_epi_logue.c -S -o pro_epi_logue.s
*/