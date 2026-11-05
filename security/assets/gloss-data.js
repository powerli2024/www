/* 系统安全学习站 —— 术语表数据（本地，无外部依赖）
   每条：id（锚点）、zh 中文名、en 英文名、def 一句话定义、ctx 在 42.c 里的对应 */
window.SYS_SEC_GLOSSARY = [
  {
    id: "g-tu", zh: "翻译单元", en: "Translation Unit",
    def: "一个 .c 文件连同它包含的头文件全部展开后的整体。",
    ctx: "42.c + stdio.h + unistd.h 展开后 = 42.i 的 2084 行。"
  },
  {
    id: "g-cpp", zh: "预处理", en: "Preprocessing (cpp)",
    def: "只做文本替换，不检查语法，输出一个完整的翻译单元。",
    ctx: "gcc -E 42.c -o 42.i。"
  },
  {
    id: "g-include", zh: "头文件包含", en: "#include",
    def: "把被包含文件的内容原样插入当前位置的文本操作。",
    ctx: "42.i 第 1–2069 行几乎全是头文件内容。"
  },
  {
    id: "g-macro", zh: "宏展开", en: "Macro Expansion",
    def: "把宏名按定义做纯文本替换，不做类型检查。",
    ctx: "42.i 第 2081 行的 x = 40 + 2 中，NUMBER 已消失。"
  },
  {
    id: "g-token", zh: "词法单元", en: "Token",
    def: "编译器切分源码得到的最小语法单位，如标识符、运算符。",
    ctx: "answer、printf、\"%s…\" 各自是一个 Token。"
  },
  {
    id: "g-ast", zh: "抽象语法树", en: "AST",
    def: "用树结构表示表达式的运算层次与语句嵌套关系。",
    ctx: "x = 40 + 2 是一棵“赋值(变量, 加法(常量, 常量))”的树。"
  },
  {
    id: "g-ir", zh: "中间表示", en: "IR",
    def: "介于源码与机器码之间的规范表示，便于分析和优化。",
    ctx: "GCC 内部用 GIMPLE/RTL，导出到 .s 后不可见。"
  },
  {
    id: "g-obj", zh: "目标文件", en: "Object File (.o)",
    def: "已汇编成机器码、但地址和外部符号尚未定下来的文件。",
    ctx: "42.o：1192 字节，.text 里 answer 的地址还是 0。"
  },
  {
    id: "g-symtab", zh: "符号表", en: "Symbol Table",
    def: "记录本文件定义与引用的名字及其位置、类型、大小。",
    ctx: "42.o 的 .symtab 共 12 项，printf 的类型是 UND（未定义）。"
  },
  {
    id: "g-reloc", zh: "重定位", en: "Relocation",
    def: "把指令里的占位地址改写成最终地址的过程。",
    ctx: "42.o 的 .rel.text 有 3 项：0x10、0x15、0x49。"
  },
  {
    id: "g-link", zh: "链接", en: "Linking",
    def: "合并多个目标文件与库，完成符号解析和地址分配。",
    ctx: "gcc 42.c -o 42，产出 7368 字节的可执行文件。"
  },
  {
    id: "g-static-link", zh: "静态链接", en: "Static Linking",
    def: "把库代码直接复制进可执行文件，运行时不再找库。",
    ctx: "课件未对 42 做静态链接演示。"
  },
  {
    id: "g-dyn-link", zh: "动态链接", en: "Dynamic Linking",
    def: "可执行文件只记库名与符号，运行时由加载器填真实地址。",
    ctx: "42 里 printf 的地址直到第一次调用才写进 GOT。"
  },
  {
    id: "g-plt", zh: "过程链接表", en: "PLT",
    def: "为每个外部函数生成的一小段跳板代码，供 call 调用。",
    ctx: "printf@plt 位于 0x80482e0，占 16 字节。"
  },
  {
    id: "g-got", zh: "全局偏移表", en: "GOT",
    def: "存放外部符号真实地址的表，运行时由动态加载器填写。",
    ctx: "printf 的槽位在 0x804a00c，初值指向 PLT 内部的解析代码。"
  },
  {
    id: "g-elf", zh: "ELF", en: "Executable and Linkable Format",
    def: "Unix 系描述目标文件、可执行文件与共享库的统一格式。",
    ctx: "42.o（ET_REL）与 42（ET_EXEC）都是 ELF。"
  },
  {
    id: "g-section", zh: "节", en: "Section",
    def: "链接视图里的最小分类单位，如 .text、.data、.rodata。",
    ctx: "readelf -S 看到 42 有 30 个节，含 .plt、.got.plt。"
  },
  {
    id: "g-segment", zh: "段", en: "Segment",
    def: "执行视图里的映射单位，一个段可包含多个权限相同的节。",
    ctx: "42 只有两个 LOAD 段：一个 R+X，一个 R+W。"
  },
  {
    id: "g-phdr", zh: "程序头表", en: "Program Header Table",
    def: "告诉内核每个段从哪里加载、装到哪个虚拟地址、给什么权限。",
    ctx: "42 的程序头表有 9 项，其中 2 项是 PT_LOAD。"
  },
  {
    id: "g-vmem", zh: "虚拟内存", en: "Virtual Memory",
    def: "给每个进程一套独立、连续的地址空间，再由页表映射到物理内存。",
    ctx: "42 的代码被映射到 0x08048000 起的地址。"
  },
  {
    id: "g-page", zh: "页", en: "Page",
    def: "内存映射的最小单位，x86 常见为 4 KB。",
    ctx: "段的 p_align 是 0x1000，正好一页。"
  },
  {
    id: "g-frame", zh: "栈帧", en: "Stack Frame",
    def: "一次函数调用在栈上占用的那块区域，存放参数、返回地址和局部变量。",
    ctx: "answer 的栈帧由 push ebp / mov ebp,esp / sub esp,8 建立。"
  },
  {
    id: "g-retaddr", zh: "返回地址", en: "Return Address",
    def: "call 指令自动压栈的“回来时接着执行哪条指令”的地址。",
    ctx: "在 answer 的帧里位于 ebp+4，被 ret 弹进 EIP。"
  },
  {
    id: "g-prologue", zh: "函数序言", en: "Prologue",
    def: "函数开头建立栈帧的三条典型指令：push ebp、mov ebp,esp、sub esp,N。",
    ctx: "42.s 第 11–16 行。"
  },
  {
    id: "g-epilogue", zh: "函数结语", en: "Epilogue",
    def: "函数返回前恢复栈与帧指针的动作，典型是 leave 后接 ret。",
    ctx: "42.s 第 24–27 行。"
  },
  {
    id: "g-cdecl", zh: "cdecl 调用约定", en: "cdecl",
    def: "参数从右到左压栈、调用者清栈、返回值放 eax 的 32 位约定。",
    ctx: "42 中 main 先 push x 再 push argv[1]，call 后 add esp,16。"
  },
  {
    id: "g-caller-save", zh: "调用者保存寄存器", en: "Caller-saved",
    def: "调用前后可能被改写的寄存器，调用者若要保留须自己先存。",
    ctx: "eax、ecx、edx 属此类；42 里 eax 用来传 argv[1]。"
  },
  {
    id: "g-callee-save", zh: "被调用者保存寄存器", en: "Callee-saved",
    def: "被调用函数必须原样恢复的寄存器，它改了就要自己存回去。",
    ctx: "ebx、esi、edi、ebp 属此类。"
  },
  {
    id: "g-canary", zh: "栈保护字", en: "Stack Canary",
    def: "放在局部变量与返回地址之间的随机值，函数返回前校验它是否被改。",
    ctx: "42.c 没有数组，编译器不插入 canary；有 char 数组时才会出现。"
  },
  {
    id: "g-pie", zh: "位置无关可执行文件", en: "PIE",
    def: "整个程序可被装到任意基址，配合 ASLR 让代码地址也随机。",
    ctx: "课件的 42 是固定基址 0x08048000，未开 PIE。"
  },
  {
    id: "g-aslr", zh: "地址空间随机化", en: "ASLR",
    def: "每次运行随机化栈、堆、库的基址，抬高猜地址的成本。",
    ctx: "课件第 7 章专门讨论；本章只埋一句。"
  },
  {
    id: "g-nx", zh: "不可执行栈", en: "NX / W^X",
    def: "把栈与堆标成不可执行，注入的 shellcode 无法直接运行。",
    ctx: "42 的 RW 段 flags=6，没有执行位，即 NX 生效。"
  },
  {
    id: "g-libc", zh: "C 标准库", en: "libc.so",
    def: "运行时加载的共享 C 库，装着 printf、system、malloc 等实现。",
    ctx: "42 里的 printf 地址就由动态链接器从 libc 填进 .got.plt。"
  },
  {
    id: "g-ret2libc", zh: "返回到 libc", en: "return-to-libc",
    def: "把返回地址改成库函数地址，靠伪造参数帧借用已有代码。",
    ctx: "2-4 第 14–31 页用 pro_epi_logue.c 逐帧演示；本站第 8 章。"
  },
  {
    id: "g-gadget", zh: "指令片段", en: "gadget",
    def: "以 ret 结尾的一小段机器码，通常 1–5 条指令。",
    ctx: "rop/stack 里的 pop eax; ret、mov [edx],eax; ret 等。"
  },
  {
    id: "g-rop", zh: "返回导向编程", en: "ROP",
    def: "用 ret 当调度器，把若干 gadget 串成任意逻辑。",
    ctx: "栈上只放地址，不需要可执行栈；本站第 9 章。"
  },
  {
    id: "g-shellcode", zh: "注入代码", en: "shellcode",
    def: "一段位置无关的机器码，通常以 execve('/bin/sh') 结束。",
    ctx: "第 4 章 stack_exploit.py 里的 48 字节载荷；第 9 章用 gadget 拼等价链。"
  }
];
