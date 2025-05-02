"for" @keyword.repeat
"in" @keyword.repeat
(number) @number

((comment)+ @comment)

"func" @keyword.function
(function_identifier) @function
(function_parameter) @variable.parameter

(boolean) @boolean
(string) @string
(escape_sequence) @string.escape

"setvar" @keyword
"var" @keyword
"const" @keyword
(variable) @variable
(positional_argument) @variable

(dollar_token) @punctuation.special

(function_name) @function
(function_call) @function.call
((function_name) @function.builtin (#any-of? @function.builtin "echo" "cat"))

(empty_array) @punctuation.brackets
(empty_dict) @punctuation.brackets

(constant) @constant

(left_paren) @punctuation.bracket
(left_bracket) @punctuation.bracket
(right_paren) @punctuation.bracket
(right_bracket) @punctuation.bracket

(range_operator) @operator
(equal_sign) @operator
(comma) @punctuation.delimiter
