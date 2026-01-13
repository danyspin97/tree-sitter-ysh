; neovim-specific highlight priority overrides.

((string) @string (#set! priority 10))

((command_name) @function.call (#set! priority 90))

((variable_name) @variable (#set! priority 20))

(function_call (function_name) @function.call (#set! priority 90))
