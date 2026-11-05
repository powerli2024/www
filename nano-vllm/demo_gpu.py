"""Reviewed nano-vLLM demo for the frozen source. Requires a working CUDA environment.
This script was syntax-checked, not GPU-executed during the animation review.
"""
import argparse
import os
from nanovllm import LLM, SamplingParams
from transformers import AutoTokenizer


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', default='~/huggingface/Qwen3-0.6B')
    parser.add_argument('--graph', action='store_true')
    parser.add_argument('--tp', type=int, default=1)
    args = parser.parse_args()
    path = os.path.abspath(os.path.expanduser(args.model))
    tokenizer = AutoTokenizer.from_pretrained(path)
    llm = LLM(path, enforce_eager=not args.graph, tensor_parallel_size=args.tp,
              max_model_len=1024, max_num_batched_tokens=1024,
              max_num_seqs=32, gpu_memory_utilization=0.7)
    prompts = [tokenizer.apply_chat_template(
        [{'role':'user', 'content':'Explain why a causal language model can reuse old key-value tensors.'}],
        tokenize=False, add_generation_prompt=True,
    )]
    result = llm.generate(prompts, SamplingParams(temperature=0.6, max_tokens=64))
    print(result[0]['text'])
    # Avoid a second explicit llm.exit(): LLMEngine already registers exit with atexit.


if __name__ == '__main__':
    main()
