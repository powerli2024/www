window.VOICE_DATA = {
  "intro": "音色参考先作为音频资产保存，生成时才变成模型条件。yovoice 负责文件、ID、校验与参数适配；audio.cpp 负责读取波形和模型推理。不同模型提取和使用的条件不同。以下基于 yovoice 666c496 与 audio.cpp v0.9.1 固定源码；动画是机制说明，不是这台电脑的运行记录。",
  "steps": [
    {
      "title": "选一段声音，或现场录音",
      "subtitle": "文件与麦克风最终提供音频字节",
      "body": "VoicePicker 的文件按钮取得 File；录音通过 getUserMedia、MediaRecorder 收集声音，再由 AudioContext 解码。录音保存为单声道 PCM16 WAV，保留解码后的采样率，最长截取 60 秒。这里还没有调用语音模型。",
      "payload": "File / Blob → Base64\n录音：decodeAudioData → encodeWav",
      "source": {
        "file": "web/src/features/media/voice-picker.tsx",
        "line": 42,
        "label": "importing / record"
      }
    },
    {
      "title": "把字节送到本机 Go 服务",
      "subtitle": "voice.record 也接收文件导入",
      "body": "当前桌面文件导入和录音都使用 voice.record，携带 name 与 base64。desktopCall 经原生宿主转发 /api/call；Go 解码后，ImportVoiceFrom 写入临时文件。宿主另有 voice.import 文件路径分支，但当前 VoicePicker 主路径不走它。",
      "payload": "{method:\"voice.record\",data:{name,base64}}\nBase64 → bytes → downloads/upload-*",
      "source": {
        "file": "internal/desktop/rpc.go",
        "line": 131,
        "label": "voice.import / voice.record"
      }
    },
    {
      "title": "检查格式并保存音色资产",
      "subtitle": "音色库保存 WAV 和元数据",
      "body": "ImportVoice 检查文件大小与 1–60 秒时长。可直接解析的 WAV 原样复制；解析失败时使用随包 ffmpeg 转为 24kHz、单声道、PCM16 WAV。随后写入 voices/ID.wav，并持久化 Voice。这个阶段保存的不是说话人向量。",
      "payload": "Voice {id,name,fileName,duration,referenceText}\nvoices/ID.wav + 数据库记录",
      "source": {
        "file": "internal/workbench/voices.go",
        "line": 19,
        "label": "importVoice"
      }
    },
    {
      "title": "把音色 ID 绑定到草稿",
      "subtitle": "参考原文与待生成正文是两个字段",
      "body": "选中音色后，草稿保存 voiceId，并复制音色的 referenceText；选择演绎参考时改写 emotionVoiceId。要说的新内容在 Draft.text。参考原文可手动修改，导入流程没有自动转写。随后 generation.start 发送草稿对象。",
      "payload": "Draft {text,modelId,voiceId,referenceText,\n       emotionVoiceId,voxMode,voiceMode}",
      "source": {
        "file": "web/src/app/workbench-chrome.tsx",
        "line": 272,
        "label": "selectVoice"
      }
    },
    {
      "title": "找到真正的音频文件",
      "subtitle": "prepareSynthesis 先检查每一个生成段",
      "body": "根据草稿或角色生成分段，校验设置并找到已安装模型；RequiresVoice 决定本模式是否需要参考音频。MediaFile 将 voiceId 解析成数据目录内的 WAV 路径，并另行解析 emotionVoiceId。BuildRequest 在这里先做一次请求检查。",
      "payload": "voiceId → Voice.fileName → WAV 路径\nsynthesisPart {draft,model,voice,emotion}",
      "source": {
        "file": "internal/workbench/segments.go",
        "line": 25,
        "label": "prepareSynthesis"
      }
    },
    {
      "title": "翻译成模型请求，再发送",
      "subtitle": "此时传给引擎的是本机文件路径",
      "body": "BuildRequest 按模型家族组织 voice_ref、audio、reference_text 和 options。Engine.Generate 启动或复用 audio.cpp；Engine.run 向回环地址的 /v1/tasks/run 发送 JSON。audio.cpp 读取路径中的 WAV 后才产生模型条件。model:index 是注册 ID，实际家族由启动配置指定。",
      "payload": "POST /v1/tasks/run\n{model:\"index\",request:{text,voice_ref,options}}",
      "source": {
        "file": "internal/engine/request.go",
        "line": 23,
        "label": "BuildRequest"
      }
    }
  ],
  "models": [
    {
      "id": "qwen",
      "name": "Qwen3-TTS Base",
      "summary": "没有参考原文：使用说话人向量条件；有原文：增加参考语音编码与参考文字，进入 ICL（上下文示例）路径。",
      "steps": [
        {
          "title": "选择克隆模式",
          "body": "读取 voice_ref 对应的音频，并读取 options.reference_text 与 x_vector_only_mode。yovoice 根据参考原文是否为空设置这个开关；这里只讨论 Base，CustomVoice 和 VoiceDesign 是其他分支。",
          "payload": "空原文 → SpeakerEmbeddingOnly\n有原文 → Icl",
          "source": {
            "url": "https://github.com/0xShug0/audio.cpp/blob/cf124a67cc55d8f65a9a15eec69edbff0fb212c8/src/models/qwen3_tts/session.cpp#L574",
            "label": "make_request / Base 分支"
          }
        },
        {
          "title": "提取说话人条件",
          "body": "两种 Base 克隆模式都会通过说话人编码器，把参考波形转换为 speaker_embedding。它是模型的条件表示，不是用户身份数据库记录。",
          "payload": "reference_audio → speaker_encoder.encode\n→ speaker_embedding",
          "source": {
            "url": "https://github.com/0xShug0/audio.cpp/blob/cf124a67cc55d8f65a9a15eec69edbff0fb212c8/src/models/qwen3_tts/prompt_tts_voice_clone.cpp#L32",
            "label": "build_voice_prompt"
          }
        },
        {
          "title": "有原文时再构造示例",
          "body": "ICL 分支还用语音编码器得到 reference_codes，并把准确的参考原文变成 reference_text_ids。只有说话人向量的模式跳过这两项，因此不能把两种模式都画成同一个向量输入。",
          "payload": "ICL: WAV → reference_codes\n参考原文 → reference_text_ids",
          "source": {
            "url": "https://github.com/0xShug0/audio.cpp/blob/cf124a67cc55d8f65a9a15eec69edbff0fb212c8/src/models/qwen3_tts/prompt_tts_voice_clone.cpp#L35",
            "label": "build_voice_prompt / ICL"
          }
        },
        {
          "title": "把新正文与参考条件送入 Talker",
          "body": "build_prefill 编码目标文本，同时携带说话人向量、可选的参考语音编码与参考文字。Talker 根据这些条件生成新的语音编码；没有把用户音频当作待朗读正文。",
          "payload": "input_ids + speaker_embedding\n+ [reference_ids, reference_codes]",
          "source": {
            "url": "https://github.com/0xShug0/audio.cpp/blob/cf124a67cc55d8f65a9a15eec69edbff0fb212c8/src/models/qwen3_tts/prompt_tts_voice_clone.cpp#L47",
            "label": "build_prefill"
          }
        },
        {
          "title": "语音编码还原成波形",
          "body": "Talker 输出 generated_codes，语音解码器生成波形。存在参考编码时采用 decode_and_trim_reference，将解码用的参考上下文从最终输出裁去。",
          "payload": "generated_codes → speech_decoder\n→ 新音频",
          "source": {
            "url": "https://github.com/0xShug0/audio.cpp/blob/cf124a67cc55d8f65a9a15eec69edbff0fb212c8/src/models/qwen3_tts/session.cpp#L479",
            "label": "Base 推理与解码"
          }
        }
      ],
      "fields": [
        {
          "name": "request.voice_ref",
          "value": "音色库 WAV 路径",
          "why": "提供参考声音，Base 必需。"
        },
        {
          "name": "request.options.reference_text",
          "value": "参考音频里实际说的话；非空才设置",
          "why": "提供 ICL 的文字示例，不是声音描述。"
        },
        {
          "name": "request.options.x_vector_only_mode",
          "value": "referenceText 为空时 true，否则 false",
          "why": "决定是否额外使用参考语音编码和参考文字。"
        }
      ],
      "caveat": "源码确认了条件分支与生成流程；没有据此证明某种参考时长或模式在所有语料上更像。此路径是条件推理，保存音色不等于训练一个新模型。"
    },
    {
      "id": "index",
      "name": "IndexTTS 2.0 / 2.5",
      "summary": "同一参考声音参与语义、声学和风格等多条条件路径；还可另给演绎参考。不能简化成一个声纹向量。",
      "steps": [
        {
          "title": "区分音色参考和演绎参考",
          "body": "voice_ref 进入 speaker_audio；yovoice 的参考演绎模式把另一音频放进 audio。没有独立演绎音频时，session 默认使用音色参考作为演绎参考；向量或文本情绪另有分支。",
          "payload": "speaker_audio：谁的声音\nemotion_audio：怎样表达",
          "source": {
            "url": "https://github.com/0xShug0/audio.cpp/blob/cf124a67cc55d8f65a9a15eec69edbff0fb212c8/src/models/index_tts2/session.cpp#L739",
            "label": "run / speaker 与 emotion"
          }
        },
        {
          "title": "从音色参考得到多种表示",
          "body": "resolve_speaker_state 预处理音频，提取语义特征、参考梅尔谱与 CAMPPlus style 向量，再构造 prompt_condition。2.0 会量化参考语义；2.5 在此处直接对语义序列做长度调节。",
          "payload": "WAV → semantic + reference_mel\n+ style + prompt_condition",
          "source": {
            "url": "https://github.com/0xShug0/audio.cpp/blob/cf124a67cc55d8f65a9a15eec69edbff0fb212c8/src/models/index_tts2/session.cpp#L384",
            "label": "resolve_speaker_state"
          }
        },
        {
          "title": "生成新的语音语义",
          "body": "GPT 接收目标文字和演绎条件生成新语音编码。2.0 在这里使用 speaker_semantic；2.5 改用 speaker_style 与语言 ID。演绎语义仍独立进入 generation。",
          "payload": "text_tokens + speaker 条件\n+ emotion_semantic → generated.codes",
          "source": {
            "url": "https://github.com/0xShug0/audio.cpp/blob/cf124a67cc55d8f65a9a15eec69edbff0fb212c8/src/models/index_tts2/session.cpp#L635",
            "label": "synthesize_segment / GPT 请求"
          }
        },
        {
          "title": "生成梅尔频谱",
          "body": "生成内容经过长度调节，与参考 prompt_condition 拼接；S2Mel 同时接收参考梅尔谱和 style 条件，生成目标梅尔谱。音色参考会影响不止一个模型阶段。",
          "payload": "condition + reference_mel + style\n→ S2Mel → mel",
          "source": {
            "url": "https://github.com/0xShug0/audio.cpp/blob/cf124a67cc55d8f65a9a15eec69edbff0fb212c8/src/models/index_tts2/session.cpp#L700",
            "label": "synthesize_segment / S2Mel"
          }
        },
        {
          "title": "声码器生成波形",
          "body": "vocoder 将生成的梅尔谱转换为单声道波形，session 再按段组合结果。这里与 Qwen 的语音 codec 解码链不同。",
          "payload": "mel → vocoder.synthesize → waveform",
          "source": {
            "url": "https://github.com/0xShug0/audio.cpp/blob/cf124a67cc55d8f65a9a15eec69edbff0fb212c8/src/models/index_tts2/session.cpp#L726",
            "label": "synthesize_segment / vocoder"
          }
        }
      ],
      "fields": [
        {
          "name": "request.voice_ref",
          "value": "音色参考 WAV 路径",
          "why": "必需的说话人音频来源；并不要求参考原文。"
        },
        {
          "name": "request.audio",
          "value": "仅参考演绎模式传入另一 WAV",
          "why": "用于演绎参考；和 VoxCPM2 同名字段的用途不同。"
        },
        {
          "name": "request.options.emotion_alpha",
          "value": "Draft.emotionStrength",
          "why": "控制参考演绎/情绪条件的强度，不是声纹提取精度。"
        },
        {
          "name": "Draft.referenceText",
          "value": "此 IndexTTS 请求分支不转发它",
          "why": "不能把所有模型都解释成“参考音频加原文”。"
        }
      ],
      "caveat": "图中必须区分 2.0 与 2.5 的条件差异。支持音色/情绪分别输入，并不证明它们在真实声音中已完美解耦，也不保证任意参考录音的克隆质量。"
    },
    {
      "id": "vox",
      "name": "VoxCPM2",
      "summary": "参考音频编码成连续 AudioVAE 特征块。普通克隆与带原文的续写提示走不同条件位置，生成过程中逐块产生连续语音特征。",
      "steps": [
        {
          "title": "把参考与续写提示分开",
          "body": "voice_ref 进入 reference_audio；audio 进入 prompt_audio，配套 reference_text 进入 prompt_text。普通克隆只有参考通道；yovoice 的 continuation 精细克隆会把同一 WAV 同时放入两个通道。",
          "payload": "clone: reference_audio\ncontinuation: reference_audio + prompt_audio + prompt_text",
          "source": {
            "url": "https://github.com/0xShug0/audio.cpp/blob/cf124a67cc55d8f65a9a15eec69edbff0fb212c8/src/models/voxcpm2/session.cpp#L346",
            "label": "run / encoded_prompt_for_request"
          }
        },
        {
          "title": "AudioVAE 编码连续特征",
          "body": "音频混为单声道，按编码器采样率重采样并补齐。参考通道得到 reference_features；续写通道得到 prompt_features 且必须有原文。这些是连续特征序列，不是一个统一声纹向量。",
          "payload": "reference_audio → reference_features\nprompt_audio → prompt_features",
          "source": {
            "url": "https://github.com/0xShug0/audio.cpp/blob/cf124a67cc55d8f65a9a15eec69edbff0fb212c8/src/models/voxcpm2/audiovae.cpp#L617",
            "label": "encode_prompt_audio / encode_audio"
          }
        },
        {
          "title": "构造不同位置的上下文",
          "body": "参考特征被包在参考音频起止标记内。若有续写提示，参考原文与目标正文组成文本，prompt_features 放到语音开始标记之后。两路虽可来自同一 WAV，角色仍不同。",
          "payload": "[参考音频块] + [参考原文 + 目标文字]\n+ [音频开始] + [续写音频块]",
          "source": {
            "url": "https://github.com/0xShug0/audio.cpp/blob/cf124a67cc55d8f65a9a15eec69edbff0fb212c8/src/models/voxcpm2/generator.cpp#L1310",
            "label": "build_prefill_sequence"
          }
        },
        {
          "title": "逐块生成连续语音",
          "body": "语言模型和残差状态提供条件；CFM（条件流匹配）按指定步数和引导强度生成下一个连续特征块，再把生成块接回序列。tokenizer-free 指不依赖离散语音 token，文字仍会分词。",
          "payload": "LM / residual 条件 → CFM\n→ generated_features（连续块）",
          "source": {
            "url": "https://github.com/0xShug0/audio.cpp/blob/cf124a67cc55d8f65a9a15eec69edbff0fb212c8/src/models/voxcpm2/generator.cpp#L1584",
            "label": "生成循环 / cfm_.generate_patch"
          }
        },
        {
          "title": "解码并去掉提示上下文",
          "body": "AudioVAE decoder 将特征块还原成波形。如果解码包含续写提示的上下文，session 根据 decode_trim_patches 裁去这部分，再组合生成段。",
          "payload": "decode_features → AudioVAE decoder\n→ 裁去提示上下文 → 新音频",
          "source": {
            "url": "https://github.com/0xShug0/audio.cpp/blob/cf124a67cc55d8f65a9a15eec69edbff0fb212c8/src/models/voxcpm2/session.cpp#L365",
            "label": "run / decode_features"
          }
        }
      ],
      "fields": [
        {
          "name": "request.voice_ref",
          "value": "clone 与 continuation 的参考路径",
          "why": "为独立参考通道提供连续语音特征。"
        },
        {
          "name": "request.audio",
          "value": "仅 continuation：与 voice_ref 相同的路径",
          "why": "同一音频同时用作续写提示；仅填原文而没有此字段不等价。"
        },
        {
          "name": "request.reference_text",
          "value": "continuation 模式的匹配原文",
          "why": "位于 request 顶层；audio.cpp 解析器会转入 options。"
        },
        {
          "name": "request.text",
          "value": "目标文字；非 continuation 可前缀声音描述",
          "why": "续写模式沿用参考演绎，yovoice 不再添加设计描述前缀。"
        }
      ],
      "caveat": "这里展示 audio.cpp v0.9.1 的实现，不是运行测量。多段续写策略还可能把前一段生成特征作为后一段提示；长参考能通过长度检查，也不等于效果或资源占用一定合适。"
    }
  ],
  "pitfalls": [
    {
      "title": "音色库条目不是模型声纹",
      "body": "Voice 存 ID、文件名、时长和可选原文；WAV 独立保存。模型条件在推理引擎中生成，进程内可能缓存；保存音色并未训练新模型。"
    },
    {
      "title": "Base64、路径、特征是三个阶段",
      "body": "当前界面把文件字节编码为 Base64 送给 Go；Go 向 audio.cpp 传本机 WAV 路径；audio.cpp 再把波形变成模型专用条件。Base64 不是音频特征。"
    },
    {
      "title": "不能说所有输入都先转为 24kHz",
      "body": "只有 Go 转换分支固定输出 24kHz PCM16 单声道；可直接解析的 WAV 保持原样，浏览器录音保留解码后的采样率，各模型还会按自身需要预处理。"
    },
    {
      "title": "referenceText 不是目标台词",
      "body": "text 是要新生成的内容；referenceText 应匹配参考音频。导入或录音没有自动转写步骤，也没有验证文字与声音逐字匹配。"
    },
    {
      "title": "audio 字段的语义随模型变化",
      "body": "IndexTTS 把 audio 用于演绎参考；VoxCPM2 把 audio 用于带原文的续写提示。字段名字相同，不表示模型操作相同。"
    },
    {
      "title": "预览与动画不能证明真实推理成功",
      "body": "普通浏览器入口走 preview 后端；本页是源码机制演示。音色相似度、噪声影响、性能和显存仍需要真实模型与目标硬件实验。"
    }
  ]
};
