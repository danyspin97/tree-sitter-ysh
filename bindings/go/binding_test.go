package tree_sitter_ysh_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_ysh "github.com/danyspin97/tree-sitter-ysh/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_ysh.Language())
	if language == nil {
		t.Errorf("Error loading YSH grammar")
	}
}
