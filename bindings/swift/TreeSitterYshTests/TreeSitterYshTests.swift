import XCTest
import SwiftTreeSitter
import TreeSitterYsh

final class TreeSitterYshTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_ysh())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading YSH grammar")
    }
}
