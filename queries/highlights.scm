(string) @string

[
  "var"
  "setvar"
  "const"
  "setglobal"
  "call"
] @keyword

[
  "for"
  "in"
  "while"
] @keyword.repeat

[
 "if"
 "elif"
 "else"
 "case"
] @keyword.conditional

(number) @number

((comment)+ @comment)

((command_name) @function.builtin
  (#any-of? @function.builtin "echo" "type" "shopt" "json" "write" "assert" "fork" "forkwait"))
((command_name) @keyword.import
  (#eq? @keyword.import "use"))
((command_name) "=" @keyword.debug)
((command_name) @function.call (#set! priority 90))

[
  "func"
  "proc"
] @keyword.function

"return" @keyword.return

[
  "!"
  "+"
  "-"
  "*"
  "/"
  "**"
  "<"
  ">"
  "|"
  "^"
  "&"
  ">>"
  "<<"
  "%"
  "<="
  ">="
  "="
  "=="
  "==="
  "~=="
  "!=="
  "~"
  "!~"
  "~~"
  "!~~"
  "++"
  ":-"
  "=>"
  "."
  "->"
  (range_operator)
] @operator

[
  "or"
  "and"
  "not"
] @keyword.operator

(boolean) @boolean

variable: (variable_name) @variable
((variable_name) @variable
             (#set! priority 10))
(variable_assignment key: (variable_name) @property)

(command_call (word) @variable.parameter)

; (dollar_token) @punctuation.special

member: (variable_name) @variable.member
key: (variable_name) @variable.member
             (#set! priority 10)

((variable_name) @variable.builtin
                 (#eq? @variable.builtin "_error"))

(function_definition (function_name) @function.method)
(proc_definition (function_name) @function.method)
(function_call call: (function_name) @function.call
             (#set! priority 90))
(method_call method: (function_name) @function.method.call)
(function_parameter) @variable.parameter
(rest_of_arguments) @variable.parameter

[
  (escape_sequence)
  (escaped_bytes)
  (escape_special_characters)
  (escaped_newline)
  (escaped_double_quote)
  (escaped_single_quote)
  (escaped_newline_value)
] @string.escape

; (function_call) @function.call
; ((function_name) @function.builtin (#any-of? @function.builtin "echo" "cat"))

; (constant) @constant

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
  "/"
] @punctuation.bracket

(literal_list [ ":|" "|" ] @punctuation.bracket)

"," @punctuation.delimiter

[
 "$"
 ";"
 "@"
] @punctuation.special

(ERROR) @error
