![LMStud Yo: An Obsidian Community Plugin by The Lossless Group](https://i.imgur.com/qZbLKzJ.png)
***
# 'LMStud Yo' Obsidian Community Plugin

An Obsidian plugin that allows you to generate content using locally stored models with the LLM Studio API.

## Features

- Generate content using locally stored models with the LLM Studio API
- Toggle between streaming and non-streaming response modes
- Supports both chat completions and direct model queries
- Configurable model selection, temperature, and token limits
- System prompt support for customizing model behavior
- Seamless integration with Obsidian's editor

## Usage

1. **Accessing the Chat Interface**:
   - Click the LM Studio icon in the left sidebar, or
   - Use the command palette and search for "LM Studio Chat", or
   - Use the keyboard shortcut (if configured)

2. **Configuration**:
   - Set your LM Studio API endpoint in the plugin settings
   - Configure default model and generation parameters
   - Toggle streaming mode on/off
   - Customize system prompts for different use cases

3. **Generating Content**:
   - Type your query in the input field
   - Adjust parameters like temperature and max tokens as needed
   - Toggle streaming mode for real-time responses
   - Click "Ask LM Studio" or press Enter to generate content

## Configuration Options

- **API Endpoint**: URL of your LM Studio server (e.g., `http://192.168.0.24:1234/v1`) - Note: Include the `/v1` path as required by LM Studio
- **Default Model**: Default model to use for generation (e.g., `ibm/granite-3.2-8b`)
- **Max Tokens**: Maximum number of tokens to generate (default: 2048)
- **Temperature**: Controls randomness (0.0 to 2.0, default: 0.7)
- **Streaming**: Enable/disable real-time streaming of responses

## Contributing

We welcome contributions to this plugin! If you have any questions or suggestions, please feel free to open an issue or submit a pull request.

## License

This is under The Unlicense.  Happy hacking.

# Installation from a Clone or Fork:

1. Clone or fork this repository to your local machine.

2. Create a symbolic link from the cloned repository to the Obsidian plugins directory.

Obviously, this is my setup so you'll need to be thoughtful about the paths on your machine.

For Mac:
```bash
ln -s /Users/<username>/code/lossless-monorepo/content-farm/plugin-modules/lmstud-yo /Users/<username>/content-md/lossless/.obsidian/plugins/lmstud-yo
```

For Linux:
```bash
ln -s /home/<username>/code/lossless-monorepo/content-farm/plugin-modules/lmstud-yo /home/<username>/content-md/lossless/.obsidian/plugins/lmstud-yo
```

For Windows:
```bash
mklink /D "C:\Users\<username>\content-md\lossless\.obsidian\plugins\lmstud-yo" "C:\Users\<username>\code\lossless-monorepo\content-farm\plugin-modules\lmstud-yo"
```

    